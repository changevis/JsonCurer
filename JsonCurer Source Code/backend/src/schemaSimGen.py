# %%
import json
import networkx as nx
import os

similarity = {
    "dict_sim": 0.5,
    "arr_sim": 0.5
}

def infer_list_type(data):
    type_tree = []
    for ei in data:
        if type(ei) in [int, float]:
            type_tree.append("n")
        elif type(ei) == str:
            type_tree.append("s")
        elif type(ei) == bool:
            type_tree.append("b")
        elif ei == None:
            type_tree.append('e')
        elif type(ei) == dict:
            type_tree.append(infer_dict_type(ei))
        elif type(ei) == list:
            type_tree.append(infer_list_type(ei))

    return type_tree


def infer_dict_type(data):
    type_tree = {}
    for (ki, ei) in data.items():
        if type(ei) in [int, float]:
            type_tree[ki] = "n"
        elif type(ei) == str:
            type_tree[ki] = "s"
        elif type(ei) == bool:
            type_tree[ki] = "b"
        elif ei == None:
            type_tree[ki] = "e"
        elif type(ei) == dict:
            type_tree[ki] = infer_dict_type(ei)
        elif type(ei) == list:
            type_tree[ki] = infer_list_type(ei)

    return type_tree


def append2new_arr(arr_data, ele):
    temp = arr_data.copy()
    temp.append(ele)
    return temp


def infer_data_type(jsonData):
    if type(jsonData) == list:
        type_tree = infer_list_type(jsonData)
    elif type(jsonData) == dict:
        type_tree = infer_dict_type(jsonData)
    
    return type_tree
                

def group_types(types):
    '''
        describe: 对一个数组中的types进行归类
        input: ['s', 'n', 's', 's', 'b', 'n', 'd', 'd', 'd', 'a', 'a']
        output:  {S: [0,2,3], N: [1,5], B: [4], D:[6,7,8 ], A: [9,10], distinct: [SNBDA] }
    '''
    
    # group_result = {"distinct": list(dict.fromkeys(types))}
    group_result = {}
    index = 0
    for ti in types:
        if group_result.get(ti) == None:
            group_result[ti] = [index]
        else:
            group_result[ti].append(index)
        index += 1
    group_result["distinct"] = list(group_result.keys())
    
    return group_result


def top_level_type_array(type_tree):
    top_level_types = []
    for ti in type_tree:
        if type(ti) == dict:
            top_level_types.append('d')
        elif type(ti) == list:
            top_level_types.append('a')
        else:
            top_level_types.append(ti)
            
    return top_level_types


def connected_group(nodes, edges):
    '''
    input: 
        nodes: [1, 2, 3, 4, 5]
        edges: [(1,2),(2,3),(1,3),(4,5)]
    output: [[1, 2, 3] [4, 5]]
    '''
    
    G = nx.Graph()
    # 转化为图结构
    for node in nodes:
        G.add_node(node)

    for link in edges:
        G.add_edge(link[0], link[1])

    return [list(gi) for gi in nx.connected_components(G)]


def type_to_str(data_type):
    '''
    For Basic data types, its str_type remains unchanged: 'n' → 'n'
    For Array: str(sort(list))
    For Dict: str(sort(dict.keys())) 
    Example:
        type_to_str(["n","s", {"k": 12, "l": 77}, ['s', 'e']]) == type_to_str(["n", {"l": 12, "k": 7}, 's', ['e', 's']]) is True
    '''
    if type(data_type) == dict:
        keys = list(data_type.keys())
        keys.sort()
        return "dict" + str(keys) 
    if type(data_type) == list:
        data_list = [type_to_str(di) for di in data_type]
        data_list.sort()
        return str(data_list)
    return data_type


def inner_dict(type_tree, data, dataPath=[]):
    '''
    input: 
        - type_tree: 类型树
        - data: 该类型树对应的原始数据
        - nodeId: 节点的 nodeId, eg: "1.7"
        - dataPath: 节点的数据路径, eg: [2, "key1"]
    output: agg_type_tree, agg_vis_tree
    '''
    keys = list(type_tree.keys())
    types = list(type_tree.values())
    keys_len = len(keys)
    
    top_level_types = top_level_type_array(types)
    group_result = group_types(top_level_types)
    
    agg_type_tree = json.loads(json.dumps(type_tree))

    agg_vis_tree = {
        "key": None,
        "type": ["d"],
        "typeProp": [1],
        "parentIndex": 0,
        "feature": {"isMultiple": False, "isOption": False},
        "data": [[[keys_len, 1]]],
        "dataPath":[[dataPath]],
        "children": []
    }
    
    key_children_map = {}
    
    child_tree = []
    
    for tgi in group_result["distinct"]:
        if tgi == 'd':
            d_agg_type_trees = []
            d_agg_vis_trees = []
            for di in group_result['d']:
                di_type_tree = types[di]
                child_dataPath = append2new_arr(dataPath, keys[di])
                di_agg_type_tree, di_agg_vis_tree = inner_dict(di_type_tree, data[keys[di]], child_dataPath)
                d_agg_type_trees.append(di_agg_type_tree)
                
                di_agg_vis_tree["key"] = keys[di]
                
                d_agg_vis_trees.append(di_agg_vis_tree)
                tree = di_agg_vis_tree["data"][0][0][1]
                child_tree.append(tree)
                
                
            if len(d_agg_type_trees) == 1:
                agg_type_tree[keys[group_result['d'][0]]] = d_agg_type_trees[0]
                key_children_map[keys[group_result['d'][0]]] = d_agg_vis_trees[0]
                
            else:
                aggre_dicts, agg_vis_dicts, posits = outer_dicts(d_agg_type_trees, d_agg_vis_trees)
                agg_keys_di = []

                # 如果outer_dicts函数的结果是 {d1,d2,d3}, {d4,d5}, {d6} 共三组，则要将d1,d2,d3的key_name修改为 di+d2+d3
                # del_key_posits_goups = []  # 这是一个二维数组，存放在每个长度大于1的组要删除的key的位置
                del_key_names_goups = [] # 这是一个二维数组，存放在每个长度大于1的组要删除的key的name
                agg_dict_i_groups = [] # 这是一个一位数组，存放每个长度大于1的组的下标

                for agg_dict_i, pi in enumerate(posits):
                    ## dict 聚合不需要 * 号
                    agg_vis_dicts[agg_dict_i]["feature"]["isMultiple"] = False
                    if len(pi)==1:
                        agg_type_tree[keys[group_result['d'][pi[0]]]] = aggre_dicts[agg_dict_i]
                        key_children_map[keys[group_result['d'][pi[0]]]] = agg_vis_dicts[agg_dict_i]
                    else:
                        # del_key_posits = []
                        del_key_names = []
                        for pi_j in pi:
                            key_pi = group_result['d'][pi_j]
                            # del_key_posits.append(key_pi)
                            del_key_names.append(keys[key_pi])
                
                        # del_key_posits_goups.append(del_key_posits)
                        del_key_names.sort()
                        del_key_names_goups.append(del_key_names)
                        agg_dict_i_groups.append(agg_dict_i)
                
                if len(agg_dict_i_groups): # 如果大于零，说明需要改key名字：将d1,d2,d3的key_name修改为 di+d2+d3
                    new_agg_keys = keys.copy()
                    newkey_map_newtree = {}

                    for agg_dict_i, del_key_names in zip(agg_dict_i_groups, del_key_names_goups):

                        for dkni in del_key_names[1:]:
                            del new_agg_keys[new_agg_keys.index(dkni)]

                        new_key_name = "#;".join(del_key_names)
                        new_agg_keys[new_agg_keys.index(del_key_names[0])] = new_key_name
                        agg_vis_dicts[agg_dict_i]["key"] = new_key_name
                        key_children_map[new_key_name] = agg_vis_dicts[agg_dict_i]
                        newkey_map_newtree[new_key_name] = aggre_dicts[agg_dict_i]
                        
                    new_agg_type_tree = dict.fromkeys(new_agg_keys)
                    for ki, vi in newkey_map_newtree.items():
                        new_agg_type_tree[ki] = newkey_map_newtree[ki]
                    for dict_new_tree_ki in new_agg_type_tree.keys():
                        if not new_agg_type_tree[dict_new_tree_ki]: # 如果为None，则从agg_type_tree中获取
                            new_agg_type_tree[dict_new_tree_ki] = agg_type_tree[dict_new_tree_ki]
                    agg_type_tree = new_agg_type_tree    
            
        elif tgi == 'a':
            for ai in group_result['a']:
                child_dataPath = append2new_arr(dataPath, keys[ai])
                ai_agg_type_tree, ai_agg_vis_tree = inner_array(types[ai], data[keys[ai]], child_dataPath)
                agg_type_tree[keys[ai]] = ai_agg_type_tree
                ai_agg_vis_tree["key"] = keys[ai]
                key_children_map[keys[ai]] = ai_agg_vis_tree
                
                tree = ai_agg_vis_tree["data"][0][0][1]
                child_tree.append(tree)
        
        else:
            # posits = group_result[tgi]  # 某一种基本数据类型的所有下标位置
            # basic_keys = [keys[ki] for ki in posits]
            for ki in group_result[tgi]:
                bki = keys[ki]
                child_basic =  {
                    "key": bki,
                    "type": [tgi],
                    "typeProp": [1],
                    "parentIndex": 0,
                    "feature": {"isMultiple": False, "isOption": False},
                    "data": [[data[bki]]],
                    "dataPath":[[append2new_arr(dataPath, bki)]],
                    "children": []
                }
                
                # if tgi == 'e':
                #     child_basic["data"] = [[]]
                
                key_children_map[bki] = child_basic

    for ki in agg_type_tree.keys():
        agg_vis_tree["children"].append(key_children_map[ki])
    
    if len(child_tree) >0:
        agg_vis_tree["data"][0][0][1] += max(child_tree)
   
    return agg_type_tree, agg_vis_tree


def outer_dicts(type_trees, vis_trees):
    keys = []
    for di in type_trees:
        keys.append(set(di.keys()))
        
    keys_len = len(keys)
    nodes = list(range(keys_len))
    edges = []
    for ki in range(keys_len):
        for kj in range(ki+1, keys_len):
            len_union = len(keys[ki].union(keys[kj]))
            if len_union == 0: # 当空对象和空对象合并时，len_union 为零，这个时候相似度直接为1
                edges.append((ki, kj))
            else:
                simi = len(keys[ki].intersection(keys[kj])) / len_union
                if simi >= similarity["dict_sim"]:
                    edges.append((ki, kj))
    
    con_group = connected_group(nodes, edges)
    
    aggre_dicts = []
    agg_vis_trees = []
    
    for gi in con_group:
        if len(gi) == 1:
            aggre_dicts.append(type_trees[gi[0]])
            agg_vis_trees.append(vis_trees[gi[0]])
        else:
            # type_trees_gi = [type_trees[gi_j] for gi_j in gi]
            # vis_trees_gi = [vis_trees[gi_j] for gi_j in gi]
            type_trees_gi = []
            vis_trees_gi = []
            for gi_j in gi:
                type_trees_gi.append(type_trees[gi_j])
                vis_trees_gi.append(vis_trees[gi_j])
            
            gi_agg_type_tree, gi_agg_vis_tree = outer_connected_dicts(type_trees_gi, vis_trees_gi)
            aggre_dicts.append(gi_agg_type_tree)
            agg_vis_trees.append(gi_agg_vis_tree)
            
    return aggre_dicts, agg_vis_trees, con_group


def outer_connected_dicts(type_trees, vis_trees):
    
    all_keys = set()
    for dict_i in type_trees:
        all_keys = all_keys.union(set(dict_i.keys()))
    
    trees_len = len(type_trees)
    # 将agg_type_tree初始化为第一棵树可以保证一定顺序
    agg_type_tree = dict.fromkeys(type_trees[0].keys())
    # agg_vis_tree = json.loads(json.dumps(vis_trees[0]))
    agg_vis_tree = {
        "key": None,
        "type": ["d"],
        "typeProp": [trees_len],
        "parentIndex": 0,
        "feature": {"isMultiple": True, "isOption": False},
        # "data": [[len(all_keys), max([vti["data"][0][1] for vti in vis_trees])]],
        "data": [[]],
        "dataPath": [[]],
        "children": []
    }

    for vti in vis_trees:
        agg_vis_tree["data"][0].append(vti["data"][0][0])
        agg_vis_tree["dataPath"][0].append(vti["dataPath"][0][0])
    
    agg_vis_children_key_map = {}
    max_prop = 0  # 哪个key出现的prop最多
    
    for key_i in all_keys:
        # agg_type_tree[key_i] = []
        # 重新构造该 key children
        key_vis_c = {
            "key": key_i,
            "type": [],
            "typeProp": [],
            "parentIndex": 0,
            "feature": {"isMultiple": False, "isOption": False},
            "data": [],
            "dataPath": [],
            "children": []
        }
        
        # 下面代码块的逻辑是：将每个tree 中的 key_i 的data和type获取到
        data_key_i = {} # 存放当前key所有 data
        dataPath_key_i = {} # 存放当前key中普通数据类型的所有 dataPath
        type_key_i = {} # 这里存放这 同一个key下的所有 types
        key_freq = 0
        for tti, vti in zip(type_trees, vis_trees):  # 注意 tti[key_i] 可能是多种数据类型，比如：'"s"#["e"]'
            # if tti.get(key_i):  # 这样写会漏掉空数组或空对象
            if tti.get(key_i) != None:
                key_freq += 1

                # 利用 tti 找到 当前 key_i 所在数组下标
                keys = list(tti.keys())
                vis_child = vti["children"][keys.index(key_i)]  # 当前 key 的 vis tree

                key_multi_types = [] # 当前 tree 下此 key的所有数据类型
                if '+' in tti[key_i]: # 说明存在多种数据类型
                    key_multi_types = [json.loads(i) for i in tti[key_i].split("+")]
                else:
                    key_multi_types.append(tti[key_i])

                for type_index, kmt_j in enumerate(key_multi_types):
                    if type(kmt_j) == dict:
                        # 需要恢复到只属于 dict 的tree
                        if not type_key_i.get("d"):
                            type_key_i["d"] = []
                            data_key_i["d"] = []

                        dict_vis_child = {
                            "key": key_i,
                            "type": ['d'],
                            "typeProp": [vis_child["typeProp"][type_index]],
                            "parentIndex": type_index,
                            "feature": {"isMultiple": False, "isOption": False},
                            "data": [vis_child["data"][type_index]],
                            "dataPath": [vis_child["dataPath"][type_index]],
                            "children": []
                        }
                        # 找到属于这个type的真正children
                        for vci in vis_child["children"]:
                            if vci["parentIndex"] == type_index:
                                dict_vis_child["children"].append(vci)

                        type_key_i["d"].append(kmt_j)
                        data_key_i["d"].append(dict_vis_child)

                    elif type(kmt_j) == list:
                        # 需要恢复到只属于 list 的tree
                        if not type_key_i.get("a"):
                            type_key_i["a"] = []
                            data_key_i["a"] = []

                        arr_vis_child = {
                            "key": key_i,
                            "type": ['a'],
                            "typeProp": [vis_child["typeProp"][type_index]],
                            "parentIndex": type_index,
                            "feature": {"isMultiple": False, "isOption": False},
                            "data": [vis_child["data"][type_index]],
                            "dataPath": [vis_child["dataPath"][type_index]],
                            "children": []
                        }
                        # 找到属于这个type的真正children
                        for vci in vis_child["children"]:
                            if vci["parentIndex"] == type_index:
                                arr_vis_child["children"].append(vci)

                        type_key_i["a"].append(kmt_j)
                        data_key_i["a"].append(arr_vis_child)

                    else:
                        if not type_key_i.get(kmt_j):
                            type_key_i[kmt_j] = []
                            data_key_i[kmt_j] = []
                            dataPath_key_i[kmt_j] = []
                            
                        type_key_i[kmt_j].append(kmt_j)
                        data_key_i[kmt_j].extend(vis_child["data"][type_index])
                        dataPath_key_i[kmt_j].extend(vis_child["dataPath"][type_index])
                        
        if key_freq < trees_len:
            key_vis_c["feature"]["isOption"] = True
        
        
        key_i_types = [] # 当前key的数据类型，这是一个数组
        
        for kti in type_key_i.keys():
            # 注意：type_key_i.keys() 的长度不代表 当前key就有多少种数据类型，有可能该key存在两种不同的array
            if kti == 'a':
                if len(type_key_i[kti]) == 1:
                    for avti in data_key_i[kti][0]["children"]:
                        avti["parentIndex"] = len(key_i_types)
                    key_i_types.append(type_key_i[kti][0])
                    key_vis_c["children"].extend(data_key_i[kti][0]["children"])
                    key_vis_c["data"].append(data_key_i[kti][0]["data"][0])
                    key_vis_c["dataPath"].append(data_key_i[kti][0]["dataPath"][0])
                    # key_vis_c["typeProp"].append(1)
                else:
                    aggre_arrs_i, agg_vis_trees_i = outer_arrays(type_key_i[kti], data_key_i[kti])
                    for aati, avti in zip(aggre_arrs_i, agg_vis_trees_i):
                        for avti_cj in avti["children"]:
                            avti_cj["parentIndex"] = len(key_i_types)
                        key_i_types.append(aati)
                        key_vis_c["children"].extend(avti["children"])
                        key_vis_c["data"].append(avti["data"][0])
                        key_vis_c["dataPath"].append(avti["dataPath"][0])
                        # key_vis_c["typeProp"].append(avti["typeProp"][0])
                    
            elif kti == 'd':
                if len(type_key_i[kti]) == 1:
                    for avti in data_key_i[kti][0]["children"]:
                        avti["parentIndex"] = len(key_i_types)
                    key_i_types.append(type_key_i[kti][0])
                    key_vis_c["children"].extend(data_key_i[kti][0]["children"])
                    key_vis_c["data"].append(data_key_i[kti][0]["data"][0])
                    key_vis_c["dataPath"].append(data_key_i[kti][0]["dataPath"][0])
                    # key_vis_c["typeProp"].append(1)
                else:
                    aggre_arrs_i, agg_vis_trees_i, posits = outer_dicts(type_key_i[kti], data_key_i[kti])
                    for aati, avti in zip(aggre_arrs_i, agg_vis_trees_i):
                        for avti_cj in avti["children"]:
                            avti_cj["parentIndex"] = len(key_i_types)
                        key_i_types.append(aati)
                        key_vis_c["children"].extend(avti["children"])
                        key_vis_c["data"].append(avti["data"][0])
                        key_vis_c["dataPath"].append(avti["dataPath"][0])
                        # key_vis_c["typeProp"].append(avti["typeProp"][0])
            
            else:
                key_i_types.append(kti)
                key_vis_c["data"].append(data_key_i[kti])
                key_vis_c["dataPath"].append(dataPath_key_i[kti])
                # key_vis_c["typeProp"].append(len(data_key_i[kti]))
        
        key_sum_prop = 0
        for di in key_vis_c["data"]:
            di_prop = len(di)
            key_vis_c["typeProp"].append(di_prop)
            key_sum_prop += di_prop
        if max_prop < key_sum_prop:
            max_prop = key_sum_prop
        
        if len(key_i_types) == 1:
            agg_type_tree[key_i] = key_i_types[0]
        else:  # 表示该key有多种数据类型，用字符串拼接起来
            agg_type_tree[key_i] = "+".join([json.dumps(kj) for kj in key_i_types])
        key_vis_c["type"] = top_level_type_array(key_i_types)
        agg_vis_children_key_map[key_i] = key_vis_c


    for aki in agg_type_tree.keys():
        if sum(agg_vis_children_key_map[aki]["typeProp"]) < max_prop:
            agg_vis_children_key_map[aki]["feature"]["isOption"] |= True
        else:
            agg_vis_children_key_map[aki]["feature"]["isOption"] |= False
        agg_vis_tree["children"].append(agg_vis_children_key_map[aki])

    return agg_type_tree, agg_vis_tree


def inner_array(type_tree, data, dataPath=[]):
    '''
    input: 
        - type_tree: 类型树
        - data: 该类型树对应的原始数据
        - nodeId: 节点的 nodeId, eg: "1.7"
        - dataPath: 节点的数据路径, eg: [2, "key1"]
    output: agg_type_tree, agg_vis_tree
    '''
    
    agg_type_tree = []
    
    top_level_types = top_level_type_array(type_tree)
    group_result = group_types(top_level_types)
#     print(group_result)

    agg_vis_tree = {
        "key": None,
        "type": ["a"],
        "typeProp": [1],
        "parentIndex": 0,
        "feature": {"isMultiple": False, "isOption": False},
        "data": [[[len(type_tree), 1]]],
        "dataPath":[[dataPath]],
        "children": []
    }
    
    child_tree = []
    node_num = 0
    
    for tgi in group_result["distinct"]:
        if tgi == "d":
            dict_agg_trees = []
            dict_agg_vis_trees = []
            for dict_gj in group_result["d"]:
                child_dataPath = append2new_arr(dataPath, dict_gj)
                di_agg_type_tree, di_agg_vis_tree = inner_dict(type_tree[dict_gj], data[dict_gj], child_dataPath)
                
                dict_agg_trees.append(di_agg_type_tree)
                dict_agg_vis_trees.append(di_agg_vis_tree)
                child_tree.append(di_agg_vis_tree["data"][0][0][1])
                
            if len(group_result["d"]) == 1:
                agg_type_tree.append(dict_agg_trees[0])
                agg_vis_tree["children"].append(dict_agg_vis_trees[0])
            else:
                aggre_dicts, aggre_vis_dicts, posits = outer_dicts(dict_agg_trees, dict_agg_vis_trees)
                agg_type_tree.extend(aggre_dicts)
                agg_vis_tree["children"].extend(aggre_vis_dicts)
                
        elif tgi == "a":
            arr_agg_trees = []
            agg_vis_arr_trees = []
            for arr_gj in group_result["a"]:
                child_dataPath = append2new_arr(dataPath, arr_gj)
                agg_type_arr_tree, agg_vis_arr_tree = inner_array(type_tree[arr_gj], data[arr_gj], child_dataPath)
                
                arr_agg_trees.append(agg_type_arr_tree)
                agg_vis_arr_trees.append(agg_vis_arr_tree)
                
                tree = agg_vis_arr_tree["data"][0][0][1]
                child_tree.append(tree)
                        
            if len(group_result["a"]) == 1:
                agg_type_tree.append(arr_agg_trees[0])
                agg_vis_tree["children"].append(agg_vis_arr_trees[0])
            else:
                agg_type_tree_g, agg_vis_tree_g = outer_arrays(arr_agg_trees, agg_vis_arr_trees)
                agg_type_tree.extend(agg_type_tree_g)
                agg_vis_tree["children"].extend(agg_vis_tree_g)
                
        else:
            posits = group_result[tgi]
            child_basic =  {
                "key": None,
                "type": [tgi],
                "typeProp": [len(posits)],
                "parentIndex": 0,
                "feature": {"isMultiple": False, "isOption": False},
                "data": [[]],
                "dataPath":[[]],
                "children": []
            }
            if len(posits) > 1:
                child_basic["feature"]["isMultiple"] = True
            
            # if tgi != 'e':
            # child_basic["data"][0] = [data[pi] for pi in posits]
            for pi in posits:
                child_basic["data"][0].append(data[pi])
                child_basic["dataPath"][0].append(append2new_arr(dataPath, pi))
            
            agg_type_tree.append(tgi)
            agg_vis_tree["children"].append(child_basic)
            
    if len(child_tree) >0:
        agg_vis_tree["data"][0][0][1] += max(child_tree)
            
    return agg_type_tree, agg_vis_tree


def outer_arrays(type_trees, vis_trees):
    top_types = []
    
    for ti in type_trees:
        top_types.append(set([type_to_str(type_i) for type_i in ti]))
        
    nodes_len = len(top_types)
    nodes = list(range(nodes_len))
    edges = []
    for ni in range(nodes_len):
        for nj in range(ni+1, nodes_len):
            len_union = len(top_types[ni].union(top_types[nj]))
            if len_union == 0: # 当空数组和空数组合并时，len_union 为零，这个时候相似度直接为1
                edges.append((ni, nj))
            else: 
                simi = len(top_types[ni].intersection(top_types[nj])) / len_union
                if simi >= similarity["arr_sim"]:
                    edges.append((ni, nj))
    
    con_group = connected_group(nodes, edges)
    
    aggre_arrs = []
    agg_vis_trees = []
    
    for gi in con_group:
        if len(gi) == 1:
            aggre_arrs.append(type_trees[gi[0]])
            agg_vis_trees.append(vis_trees[gi[0]])
        else:
            # type_trees_gi = [type_trees[gi_j] for gi_j in gi]
            # vis_trees_gi = [vis_trees[gi_j] for gi_j in gi]
            type_trees_gi = []
            vis_trees_gi = []
            for gi_j in gi:
                type_trees_gi.append(type_trees[gi_j])
                vis_trees_gi.append(vis_trees[gi_j])
                
            gi_agg_type_tree, gi_agg_vis_tree = outer_connected_arrays(type_trees_gi, vis_trees_gi)
            aggre_arrs.append(gi_agg_type_tree)
            agg_vis_trees.append(gi_agg_vis_tree)
            
    return aggre_arrs, agg_vis_trees


def outer_connected_arrays(type_trees, vis_trees):
    '''
    input: [['b', 'n', ['s', 'n'], 's'], ['b', ['n', 's'], 's']]
    output: [['b', 'n', ['s', 'n'], 's', ['n', 's']]]
    '''
    agg_type_tree = json.loads(json.dumps(type_trees[0]))
    agg_vis_tree = json.loads(json.dumps(vis_trees[0]))
    
    agg_vis_tree["typeProp"] = [len(type_trees)]
    agg_vis_tree["feature"]["isMultiple"] = True
    # agg_vis_tree["data"] = agg_vis_tree["data"]
    
    common_types = None  # 共有的类型元素
    for tti in type_trees:
        type_set = set([type_to_str(i) for i in tti])
        if common_types == None:
            common_types = type_set
        else:
            common_types = common_types.intersection(type_set)

    exist_types_str = [] # 现有的数据类型
            
    # 判断第一个tree的types是否在 common_types 中
    for ti in range(len(type_trees[0])):
        first_type_str_ti = type_to_str(type_trees[0][ti])
        exist_types_str.append(first_type_str_ti)
        if first_type_str_ti not in common_types:
            agg_vis_tree["children"][ti]["feature"]["isOption"] = True
            
    for tti in range(1, len(type_trees)):
        agg_vis_tree["data"][0].extend(vis_trees[tti]["data"][0])
        agg_vis_tree["dataPath"][0].extend(vis_trees[tti]["dataPath"][0])
        # if agg_vis_tree["type"][0] in 'ad':
        #     agg_vis_tree["data"][0].extend(vis_trees[tti]["data"][0])
        # else:
        #     agg_vis_tree["data"].extend(vis_trees[tti]["data"])
        for type_j, vis_j in zip(type_trees[tti], vis_trees[tti]["children"]):
            type_j_str = type_to_str(type_j)
            
            if type_j_str in exist_types_str:
                # type_index = agg_type_tree.index(type_j)
                type_index = exist_types_str.index(type_j_str)
                agg_vis_tree_cj = agg_vis_tree["children"][type_index]
                agg_vis_tree_cj["data"][0].extend(vis_j["data"][0])
                agg_vis_tree_cj["dataPath"][0].extend(vis_j["dataPath"][0])
                agg_vis_tree_cj["typeProp"][0] += vis_j["typeProp"][0]
                agg_vis_tree_cj["feature"]["isMultiple"] |= vis_j["feature"]["isMultiple"]
                
                if type_j_str not in common_types:
                    agg_vis_tree_cj["feature"]["isOption"] = True
                
                if type(type_j) == list: # 合并相同元素的数组
                    agg_type_tree_jz, agg_vis_tree_jz = outer_connected_arrays([agg_type_tree[type_index], type_j], [agg_vis_tree_cj, vis_j])
                    agg_vis_tree_cj["children"] = agg_vis_tree_jz["children"]
                    
                    
                if type(type_j) == dict: # 合并相同keys的字典
                    agg_type_tree_jz, agg_vis_tree_jz = outer_connected_dicts([agg_type_tree[type_index], type_j], [agg_vis_tree_cj, vis_j])
                    agg_vis_tree_cj["children"] = agg_vis_tree_jz["children"]
                    agg_type_tree[type_index] = agg_type_tree_jz

            else:
                vis_j["feature"]["isOption"] = True
                exist_types_str.append(type_j_str)
                agg_type_tree.append(type_j)
                agg_vis_tree["children"].append(vis_j)
        
    return agg_type_tree, agg_vis_tree
        

def aggregated_schema(jsonData, dict_sim = 0.5, arr_sim = 0.5):
    # jsonData = jsonData[:3]
    type_tree = infer_data_type(jsonData)
    global similarity
    similarity = {
        "dict_sim": dict_sim,
        "arr_sim": arr_sim
    }
    if type(jsonData) == list:
        agg_type_tree, agg_vis_tree  = inner_array(type_tree, jsonData)
    elif type(jsonData) == dict:
        agg_type_tree, agg_vis_tree = inner_dict(type_tree, jsonData)

    # import time
    # print(json.dumps(jsonData))
    # print(time.strftime('%Y-%m-%d %H:%M:%S',time.localtime(time.time())))
    # print(agg_type_tree, "\n")
    # print(json.dumps(agg_vis_tree))
    
    return agg_type_tree, agg_vis_tree

  

if __name__ == '__main__':

    # arr_test= [1,2,3,[4,5,'ssdf', ['xxy']], 23, 'xk']
    arr_test = [[1,2,3, "ha"], [12,'d',4,7, [["ss", {"None": [False, False, 's']}], ['xk', ["i"], 2]]]]
    # arr_test = [[1,2,3, 'k', [1,'3']], ['m', 1, ['d',1]]]
    # arr_test = [[1,2,3, 'k', ['1',23]], ['m', 2],  ['m', 1, [0,'12']]]
    # arr_test = [[1, '3'] , [2, '1']]
    arr_test = [['23', 22, {"k": 'm'}], [23, {"k": 12}]]
    arr_test = ['haha', ['23', 22, {"k": ['m', None], "h": 12}], [11, '22', {"k": [None], "h": 'k'}]]
    arr_test = [12, [], {}, {}, {}, ["45", None]]


    dict_test = {"a": [12, {"ss": 12, "kk": [None, 3, None]}], "b": 'sdf'}
    dict_test = {
    "k1": {"a": [12], "b": 'sdf'}, 
        "k5": {"a": 2, "b": '237', "c": {'ha': None, "yy": {"xxx":12}}}, 
        "k3": "kk",
        "k2": {"a": 'sss', "b": 'sdf', 'c': [1,2,"kk"]},
        "k4": {"a": [2, 6], "b": '7'}, 
        "k6": {"a": None, "b": '7', "c": {'ha': [None], "yy": [1,5]}}, 
        "k7": [[2, None], [None, 23]]
    }

    # dict_test = {"k1": {"a": [12], "b": 'sdf'}, "k4": {"a": [2, 6], "b": '7'}}

    dict_test = [{'k': 1, "cc": {'l': 23}}, {'k': {}, "cc": {'l': 23}}, {'k': [1], "cc": [2]},]
    arrayJson = [
        {"a": 12, "b": 'sdf'}, 
        {"a": 2, "b": '7'}, 
        {"a": ['sss', 23], "b": 'sdf', 'c': [1,2,"kk"]}
    ]

    agg_type_tree, agg_vis_tree = aggregated_schema(arrayJson[2], 0.5, 0.5)
    get_index_nodeId_map(agg_vis_tree)

    if False:
        filePath = '{root}/data/case{number}/data.json'.format(root=os.getcwd(), number=2)
        with open(filePath, 'r') as file:
            jsonData = json.load(file)
        _, agg_vis_tree = aggregated_schema(jsonData, 0.5, 0.5)
        print(agg_vis_tree)

        schemaStr = json.dumps(agg_vis_tree, indent=2)

        savePath = '{root}/data/case{number}/schemaGen.json'.format(root=os.getcwd(), number=2)

        fp = open(savePath, 'w')

        fp.write(schemaStr)

        fp.close()