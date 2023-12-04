from itertools import permutations, combinations
import numpy as np
import json, math


# 基于动态规划的解法
def edit_dist(str1, str2):
    # print(edit_dist(range(12), range(1,13)))

    # m，n分别字符串str1和str2的长度
    m, n = len(str1), len(str2)
    
    # 构建二位数组来存储子问题（sub-problem)的答案 
    dp = [[0 for x in range(n+1)] for x in range(m+1)] 
      
    # 利用动态规划算法，填充数组
    for i in range(m+1): 
        for j in range(n+1): 
  
            # 假设第一个字符串为空，则转换的代价为j (j次的插入)
            if i == 0: 
                dp[i][j] = j    
              
            # 同样的，假设第二个字符串为空，则转换的代价为i (i次的插入)
            elif j == 0:
                dp[i][j] = i
            
            # 如果最后一个字符相等，就不会产生代价
            elif str1[i-1] == str2[j-1]: 
                dp[i][j] = dp[i-1][j-1] 
  
            # 如果最后一个字符不一样，则考虑多种可能性，并且选择其中最小的值
            else: 
                dp[i][j] = 1 + min(dp[i][j-1],        # Insert 
                                   dp[i-1][j],        # Remove 
                                   dp[i-1][j-1])      # Replace 
  
    return dp[m][n] 


def group_issue_sets(issue_sets):
    issue_group = {
        "siblings": [],
        "children": []
    }
    issue_hiers = {}
    for index, si in enumerate(issue_sets):
        if len(si) > 1:
            nodes = {"posit": index}
            node_path_len = 0
            group_type = "siblings"
            for sj in si:
                node_path = sj.split(".")
                if node_path_len < len(node_path):
                    if node_path_len: # 如果不为0，说明是父子节点
                        group_type = "children"
                    nodes["path"] = ".".join(node_path[:-1])
                    nodes["data"] = [int(node_path[-1])]
                    node_path_len = len(node_path)
                else:
                    nodes["data"].append(int(node_path[-1]))
            issue_group[group_type].append(nodes)
            if issue_hiers.get(nodes["path"]):
                issue_hiers[nodes["path"]] = issue_hiers[nodes["path"]].union(set(nodes["data"]))
            else:
                issue_hiers[nodes["path"]] = set(nodes["data"])
    
    return issue_group, issue_hiers


def get_new_order(tree_num, issue_sets):
    issue_group, issue_hiers = group_issue_sets(issue_sets)
    nodes_change_dict = {}

    for path_i, raw_id in issue_hiers.items():
        node_num = tree_num[path_i]
        if node_num == 1 or node_num > 8:
            continue
        center_node_id = (node_num-1)/2
        raw_id_list = list(raw_id)
        raw_id_list.sort()
        # 排列组合：permutations 为A，combinations 为C
        # print(len(list(permutations(range(node_num), len(raw_id))))) 此种方案太慢
        min_goal = float('inf') # 正无穷
        solutions = []
        # raw_order = range(raw_id_list[0], raw_id_list[-1]+1)
        id_start = math.floor(center_node_id) if raw_id_list[0] > center_node_id else raw_id_list[0]
        id_end = raw_id_list[-1]+1
        id_end = id_end if id_end > center_node_id else math.ceil(center_node_id)
        raw_order = range(id_start, id_end)
        for new_id in permutations(raw_order, len(raw_id)): # 首尾两端的节点不参与重排序
            sum_goal = 0
            # 遍历 siblings
            for sg_n in issue_group["siblings"]:
                if path_i == sg_n["path"]:
                    for si, sj in combinations(sg_n["data"], 2):
                        sum_goal += abs(new_id[raw_id_list.index(si)] - new_id[raw_id_list.index(sj)])

            # 遍历 children
            for cg_n in issue_group["children"]:
                if path_i == cg_n["path"]:
                    for ci in cg_n["data"]:
                        sum_goal += abs(new_id[raw_id_list.index(ci)] - center_node_id)
            
            if sum_goal < min_goal: # 说明有更好的方案
                min_goal = sum_goal
                solutions = [new_id]
            elif sum_goal == min_goal: # 说明有更多的候选方案
                solutions.append(new_id)


        # 计算每一种方案的编辑距离
        min_distance = float('inf')
        optimal_solution = None
        # print(len(solutions))
        for si in solutions:
            new_order = [None]*len(raw_order)
            for si_index, si_j in enumerate(si):
                # new_order[si_j-raw_id_list[0]] = raw_id_list[si_index]
                new_order[si_j-id_start] = raw_id_list[si_index]
            for i in raw_order:
                if i not in new_order:
                    new_order[new_order.index(None)] = i

            # print(128, new_order)

            dist = edit_dist(raw_order, new_order)
            if dist < min_distance:
                min_distance = dist
                optimal_solution = new_order

        # ordering_result = list(range(raw_id_list[0]))
        ordering_result = list(range(id_start))
        ordering_result.extend(optimal_solution)
        # ordering_result.extend(range(raw_id_list[-1]+1, node_num))
        ordering_result.extend(range(id_end, node_num))
        if not is_sorted(ordering_result):
            nodes_change_dict[path_i] = ordering_result

    # print(nodes_change_dict)
    return nodes_change_dict


def is_sorted(arr):
    # 判断一个数组是否有序
    for i in range(len(arr)-1):
        if arr[i] > arr[i+1]:
            return False
    return True
    

def get_index_nodeId_map(visTree):
    '''
    广度优先遍历
    output: 
        - nodeId_arr: 每个节点的id ['0', '0.1', '0.2', '0.3', '0.1.1', '0.1.2', '0.3.1', '0.3.2']
        - tree_num: 每一棵树的节点个数 {'0': 3, '0.1': 2, '0.3': 2}
    '''
    queue = [] # 初始化一个队列
    queue.append(json.loads(json.dumps(visTree)))
    queue_tree = ["0"] # 初始化一个层级队列
    nodeId_arr = []
    tree_num = {}

    id_tree = { "id": 0 }
    queue_tree_ref = [id_tree] # 初始化一个tree引用队列

    id_num = 0
    while len(queue):
        node = queue.pop(0) # 从队列的头部删除节点
        tree_id = queue_tree.pop(0)
        tree_ref = queue_tree_ref.pop(0)
        nodeId_arr.append(tree_id)
        num = 0
        
        children = []
        
        for child in node["children"]:
            queue.append(child)  # 从队列的尾部添加节点
            nodeId = "%s.%d" % (tree_id, num)
            queue_tree.append(nodeId)
            id_num += 1
            c_tree = {"id": id_num}
            queue_tree_ref.append(c_tree)
            num += 1
            children.append(c_tree)

        tree_ref["children"] = children

        if num:
            tree_num[tree_id] = num
        
    # print(nodeId_arr, tree_num)
    return nodeId_arr, tree_num, id_tree


def get_issuetypes_map(id_tree):

    queue = [] # 初始化一个队列
    queue.append(id_tree)
    issuetypes_map = {}
    
    id_num = 0
    while len(queue):
        node = queue.pop(0) 
        issuetypes_map[node["id"]] = id_num
        id_num += 1

        for child in node["children"]:
            queue.append(child)  # 从队列的尾部添加节点

    return issuetypes_map


def extract_issue_sets(nodeId_arr, issuetypes):
    issue_sets = []
    for di in issuetypes:
        for loc_i in di["locations"]:
            for loc_j in loc_i:
                issue_sets.append([nodeId_arr[ni] for ni in loc_j])
    return issue_sets


def node_reordering(visTree, issuetypes):
    nodeId_arr, tree_num, id_tree = get_index_nodeId_map(visTree)
    issue_sets = extract_issue_sets(nodeId_arr, issuetypes)
    nodes_change_dict = get_new_order(tree_num, issue_sets)
    # 按照 字典key长度从大到小重新排序，即先改变子树，再改变父树
    nodes_change_dict = dict(sorted(nodes_change_dict.items(), key=lambda x: len(x[0]), reverse=True))
    # print(nodes_change_dict)

    # 更新 visTree 节点顺序
    for node_hier, new_orders in nodes_change_dict.items():
        # print(node_hier, new_orders)
        child_path = node_hier.split(".")[1:]
        vis_child = visTree["children"]
        id_child = id_tree["children"]

        for index, hier_id in enumerate(child_path):
            hier_id = int(hier_id)
            if index == len(child_path)-1:
                tmp_vis = vis_child[hier_id]["children"]
                tmp_id = id_child[hier_id]["children"]
                new_oder_tmp_vis = np.array(tmp_vis)[new_orders]
                new_oder_tmp_id = np.array(tmp_id)[new_orders]
                vis_child[hier_id]["children"] = list(new_oder_tmp_vis)
                id_child[hier_id]["children"] = list(new_oder_tmp_id)
            else:
                vis_child = vis_child[hier_id]["children"]
                id_child = id_child[hier_id]["children"]

    # print(id_tree)
    issuetypes_map = get_issuetypes_map(id_tree)
    # print(issuetypes_map)

    # 更新 issuetypes locations id
    for di in issuetypes:
        for loc_i in di["locations"]:
            for loc_j in loc_i:
                for index, ni in enumerate(loc_j):
                    loc_j[index] = issuetypes_map[ni]

    return visTree, issuetypes


if __name__ == '__main__':

    nodeId_arr = ['0', '0.0', '0.0.0', '0.0.1', '0.0.2', '0.0.3', '0.0.4', '0.0.5', '0.0.6', '0.0.4.0', '0.0.5.0', '0.0.6.0', '0.0.5.0.0', '0.0.5.0.1', '0.0.5.0.2', '0.0.5.0.3', '0.0.5.0.0.0', '0.0.5.0.0.1', '0.0.5.0.1.0', '0.0.5.0.2.0'] 
    tree_num = {'0': 1, '0.0': 7, '0.0.4': 1, '0.0.5': 1, '0.0.6': 1, '0.0.5.0': 4, '0.0.5.0.0': 2, '0.0.5.0.1': 1, '0.0.5.0.2': 1}
    issue_sets = [['0.0.4'], ['0.0', '0.0.6'], ['0.0.5.0.0'], ['0.0.5.0.2'], ['0.0.6', '0.0.6.0'], ['0.0.4'], ['0.0.5.0.0.1'], ['0.0.6.0'], ['0.0.0'], ['0.0.5.0'], ['0.0.1', '0.0.2', '0.0.3']]

    get_new_order(tree_num, issue_sets)
