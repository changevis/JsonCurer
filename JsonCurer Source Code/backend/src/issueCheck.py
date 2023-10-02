import os
from schemaSimGen import aggregated_schema, connected_group
from collections import deque, Counter
import json
import copy
from functools import reduce
from ast import literal_eval
import difflib
import itertools

completeness = "Completeness"
consistency = "Consistency"
redundancy = "Redundancy"
duplicate = "Duplicate"
schema = "Schema"
accuracy = "Accuracy"

missingValue = 'Missing Value'
missingKey = 'Missing Key'
emptyValue = 'Empty Value'
inconsitentType = 'Inconsistent Data Type'
hierKey = 'Hierarchical Key'
inconsitentKey = 'Inconsistent Key'
redundantPaddding = 'Redundant Padding'
dataAssociations = 'Data Associations'
incorrectDataType = 'Incorrect Data Type'
partialDuplicate = 'Partial Duplicate Key-Value Pair'
allDuplicate = 'All Duplicate Key-Value Pair'
redundantInterior = 'Redundant Interior Structure'
redundantExterior = 'Redundant Exterior Structure'
dupInArray = 'Duplicate Value of an Array'
fieldWithSameValue = 'Field With Same Value'
inconsistentStructure = 'Inconsistent Structure'
redundantKey = 'Redundant Key'

def updateIssueList(general, specific, location, description, represent):
  if len(location) == 0:
    return
  issues[general]['count'] += 1
  if specific in issues[general]['details']:
    issues[general]['details'][specific]['loc'].append(location)
    issues[general]['details'][specific]['des'].append(description)
    issues[general]['details'][specific]['rep'].append(represent)
  else:
    issues[general]['details'][specific] = {
      'loc': [location],
      'des': [description],
      'rep': [represent]
    }

def generateDescription(idx):
  path = []
  generatePath(path, nodelist[idx])
  desc = []
  for d in path:
    if d == '[]' or d == '{}':
      desc.append(d)
    else:
      desc.append(d)
      break
  return desc

def typeCheck(value):
  # 在python中bool是int的subclass，为了检测bool类型，需要先于int检测
  if isinstance(value, bool):
    return 'b'
  elif isinstance(value, (int, float)):
    return 'n'
  elif isinstance(value, str):
    return 's'
  elif isinstance(value, list):
    return 'a'
  elif isinstance(value, dict):
    return 'd'
  elif value is None:
    return 'e'
  else:
    return type(value)

def isBasic(value):
  return typeCheck(value) in ('n', 's', 'b', 'e')

def isDict(value):
  return typeCheck(value) == 'd'

def isArray(value):
  return typeCheck(value) == 'a'

def traverseData(root, path):
  data = copy.deepcopy(root)
  if isBasic(data):
    return
  
  if isDict(data):
    values = list(data.values())
    vs = []
    for v in values:
      if v in vs:
        continue
      else:
        vs.append(v)
    if len(vs) == 1 and len(values) > 2:
      if path not in dictsPath: 
        dictsPath.append(path[:])
    
    path.append("{}")
    for k, v in data.items():
      path.append(k)
      traverseData(v, path)
      path.pop()
    path.pop()
    
  if isArray(data):
    vs = []
    for i in data:
      if i in vs:
        if path not in arraysPath: 
          arraysPath.append(path[:])
        break
      else:
        vs.append(i)
    
    path.append("[]")
    for i in range(0, len(data)):
      traverseData(data[i], path)
    path.pop()

def checkNull(root):
  idx = root['idx']
  if 'e' in root['type']:
    desc = generateDescription(idx)

    cnte = 0
    cntall = 0
    # 获取画图数据，分类讨论，在key下，在array下
    if len(desc) == 1:
      for t, tp in zip(root['type'], root['typeProp']):
        cntall += tp
        if(t == 'e'):
          cnte += tp
    else:
      nodeToCalcData = nodelist[root['parentId']]
      for c in nodeToCalcData['children']:
        if c['type'] == ['e']:
          cnte += c['typeProp'][0]
          cntall += c['typeProp'][0]
        else:
          cntall += reduce(lambda x,y: x+y, c['typeProp'], 0)

    updateIssueList(completeness, missingValue, [idx], desc, {'Null': cnte, 'Not Null': cntall - cnte})

def checkEmpty(root):
  idx = root['idx']
  if 's' in root['type'] or 'a' in root['type'] or 'd' in root['type']:
    sidx = [i for i in range(0, len(root['type'])) if root['type'][i] == 's' or root['type'][i] == 'a' or root['type'][i] == 'd']
    subidx = []
    cnte = 0
    cntall = 0
    for i in sidx:
      if '' in root['data'][i] or [0, 1] in root['data'][i]:
        subidx.append(i)
      for d in root['data'][i]:
        cntall += 1
        if d == '' or d == [0,1]:
          cnte += 1

    
    if len(subidx):
      res = [idx]
      desc = generateDescription(idx)
      updateIssueList(completeness, emptyValue, res, desc, {'Empty': cnte, 'NotEmpty': cntall - cnte})

def checkInconsistentType(root):
  idx = root['idx']
  if len(set(root['type'])) > 1:
    data = {}

    dcnt = 1
    acnt = 1
    for t,p in zip(root['type'], root['typeProp']):
      k = ""
      if t == 'n': k = 'number'
      elif t == 'a': k = 'array'
      elif t == 's': k = 'string'
      elif t == 'b': k = 'boolean'
      elif t == 'e': k = 'null'
      elif t == 'd': k = 'object'

      if k in data:
        if t == 'd':
          data[k + str(dcnt)] = p
          dcnt += 1
        elif t == 'a':
          data[k + str(acnt)] = p
          acnt += 1
      else:
        data[k] = p
    desc = generateDescription(idx)
    updateIssueList(consistency, inconsitentType, [idx], desc, data)

def checkHierarchicalKey(root):
  if not root['children']:
    return
  
  keys = [c['key'] for c in root['children']]
  idxs = [c['idx'] for c in root['children']]

  splitters = tuple(['_', '-', ':'])
  for spliter in splitters:
    res = []
    prefixFreq = {}
    for i in range(0, len(keys)):
      k = keys[i]
      if k == None:
        continue
      s = k.split(spliter)
      if len(s) > 1:
        if not s[0] in prefixFreq:
          prefixFreq[s[0]] = idxs[i]
        else:
          if prefixFreq[s[0]] != 'pass':
            res.append(prefixFreq[s[0]])
            prefixFreq[s[0]] = 'pass'
          res.append(idxs[i])
  
    if len(res) > 1:
      data = {'HierKeys': len(res), 'Others': len(keys) - len(res)}
      path = [nodelist[n]['key'] for n in res]
      updateIssueList(schema, hierKey, res, path, data)

def checkInconsistentKey(root):
  dpos = [i for i in range(len(root['type'])) if root['type'][i] == 'd']
  if len(dpos) == 0:
    return

  calcsum = lambda x,y: x+y
  for di in dpos:
    dic = [c for c in root['children'] if c['parentIndex'] == di and c['feature']['isOption']]
    dicProp = [reduce(calcsum, c['typeProp'], 0) for c in dic]
    diProp = root['typeProp'][di]
    threshold = 0.7

    l = len(dic)
    nodes = list(range(l))
    edges = []
    for i in range(l):
      if len(dic[i]['key'].split('#;')) > 1: continue
      for j in range(i+1, len(dic)):
        if len(dic[j]['key'].split('#;')) > 1: continue

        if difflib.SequenceMatcher(None, dic[j]['key'], dic[i]['key']).quick_ratio() > threshold:
          edges.append([i, j])
    
    conG = connected_group(nodes, edges)

    for gi in conG:
      gsumProp = reduce(calcsum, [dicProp[i] for i in gi], 0)
      if gsumProp == diProp:
        res = [dic[i]['idx'] for i in gi]
        prop = [dicProp[i] for i in gi]
        desc = [nodelist[idx]['key'] for idx in res]
        data = [{x: y} for x,y in zip(desc, prop)]
        updateIssueList(consistency, inconsitentKey, res, desc, data)

def checkRedundantPaddingAndIncorrectDataType(root):
  spos = [i for i in range(0, len(root['type'])) if root['type'][i] == 's']
  if len(spos) == 0:
    return

  resPadding = []
  okPadding = False
  cntPadding = 0
  resType = []
  okType = False
  cntType = 0
  t = tuple([' ', '\n', '\t'])
  for sp in spos:
    for s in root['data'][sp]:
      if not okPadding and (s.startswith(t) or s.endswith(t)):
        resPadding.append(root['idx'])
        cntPadding += 1
        okPadding = True
      elif (s.startswith(t) or s.endswith(t)):
        cntPadding += 1
      
      if s.replace('.','',1).isdigit(): # string represent number
        if not okType:
          resType.append(root['idx'])
          okType = True
        cntType += 1
      else:
        try:
          check = literal_eval(s)
        except:
          continue
        # string represent dict or array
        if isinstance(check, dict) or isinstance(check, list):
          if not okType: 
            resType.append(root['idx'])
            okType = True
          cntType += 1
    
    allLen = len(root['data'][sp])
    desc = generateDescription(root['idx'])
    updateIssueList(redundancy, redundantPaddding, resPadding, desc, {'Padding': cntPadding, 'Others': allLen - cntPadding})
    updateIssueList(accuracy, incorrectDataType, resType, desc, {'Misrepresented': cntType, 'Others': allLen - cntType})

def checkDataAssociations(root):
  if not root['key']:
    return
  if len(root['key'].split('#;')) > 1:
    data = [item[0] for item in root['data'][0]] # item[0]是key num boxplot
    desc = root['key'].split('#;')
    updateIssueList(schema, dataAssociations, [root['idx']], desc, data)

def checkMissingKey(root):
  dpos = [i for i in range(0, len(root['type'])) if root['type'][i] == 'd']
  if len(dpos) == 0:
    return

  for di in dpos:
    add = lambda x, y: x + len(y)
    if len(root['children']) <= di:
      continue
    didlen = reduce(add, root['children'][di]['data'], 0)
    dic = [c for c in root['children'] if c['parentIndex'] == di and c['feature']['isOption']]
    dicdlen = [reduce(add, c['data'], 0) for c in dic]
    cpos = [i for i in range(0, len(dicdlen)) if didlen > dicdlen[i]]

    cdata = [dicdlen[i] for i in range(0, len(dicdlen)) if didlen > dicdlen[i]]
    res = [dic[j]['idx'] for j in cpos]
    cdesc = [nodelist[i]['key'] for i in res]

    if len(res) > 0:
      for idx, desc, data in zip(res, cdesc, cdata):
        updateIssueList(completeness, missingKey, [idx], [desc], {'Missing': didlen-data, 'All': didlen})

def checkRedundantInterior(root):
  if not root['key']:
    return

  add = lambda x, y: x + len(y)
  # case2 d下只有一个key
  dt = [i for i in range(len(root['type'])) if root['type'][i] == 'd']
  for di in dt:
    dit = [c for c in root['children'] if c['parentIndex'] == di]
    if len(dit) == 1 and len(dit[0]['key'].split('#;')) == 1:
      res = [root['idx'], dit[0]['idx']]
      desc = ['{}' if nodelist[n]['key'] == None else nodelist[n]['key'] for n in res]
      # res[0] 是父亲，res[1]是孩子
      fatherl = reduce(add, [td for td in nodelist[res[0]]['dataPath']], 0)
      childl = reduce(add, [td for td in nodelist[res[1]]['dataPath']], 0)
      
      updateIssueList(redundancy, redundantInterior, res, desc, {'Count': childl, 'others': fatherl - childl})
      return
  
  # case1 当前d的信息出现在下一层的value中
  dpos = [i for i in range(len(root['type'])) if root['type'][i] == 'd' or root['type'][i] == 'a']
  for di in dpos:
    # 找出children中属于当前d的子节点的nsbe类
    dic = [c for c in root['children'] if c['parentIndex'] == di and len(c['type']) == 1 and c['type'][0] != 'a' and c['type'][0] != 'd']

    splitdkey = set(root['key'].split('#;'))
    for cj in dic:
      cjd = set(cj['data'][0])
      if(cjd == splitdkey):
        res = [root['idx'], cj['idx']]
        desc = [nodelist[n]['key'] for n in res]
        updateIssueList(redundancy, redundantInterior, res, desc, {'current': 1, 'others': 3})

def getLeafData(root):
  dq = deque()
  leafData = []
  idx = 0
  dq.append(root)

  while dq:
    sz = len(dq)
    for _ in range(0, sz):
      topop = dq[0]
      dq.popleft()
      if len(topop['children']) == 0:
        leafData.extend(topop['data'])
        continue
      for ci in topop['children']:
        ci['parentId'] = idx
        dq.append(ci)
  return leafData

def checkRedundantExterior(root):
  dt = [i for i in range(len(root['type'])) if root['type'][i] == 'd']

  for pi in dt:
    dtc = [c for c in root['children'] if c['parentIndex'] == pi]
    dtcad = [c for c in dtc if c['type'] == ['a'] or c['type'] == ['d']]

    LeafData = []
    for cj in dtcad:
      cjLeafData = getLeafData(cj)
      LeafData.append(cjLeafData)
    
    for i in range(len(LeafData)):
      for j in range(i+1, len(LeafData)):
        if LeafData[i] == LeafData[j]:
          res = [dtcad[i]['idx'], dtcad[j]['idx']]
          desc = [nodelist[n]['key'] for n in res]
          updateIssueList(redundancy, redundantExterior, res, desc, {'current': 1, 'others': 3}) # 可视化未知

def checkPartialAllDuplicateOfPath(originalData, path):
  cpath = copy.deepcopy(path)
  tmpData = originalData
  res = {
    'allDup': False,
    'allDupChild': [],
    'partialDup': False,
    'partialDupChild': [],
  }
  
  for i in range(len(cpath)):
    p = cpath[i]
    if i == len(cpath) - 1: # 此时的tmpData一定是array of dict
      if i == 1: tmpData = [tmpData]
      allKeys = set()
      for td in tmpData:
        dataLen = len(td)
        dupthreshold = 10
        if dataLen < dupthreshold:
          continue

        for d in td:
          allKeys = allKeys.union(set(d.keys()))

        everyKeyData = {key: [] for key in allKeys}
        for k in allKeys:
          for d in td:
            if k not in d:
              everyKeyData[k].append(None)
            else:
              everyKeyData[k].append(d[k])

        ratio = 0.125 # partial dup判定的threshold

        for k, v in everyKeyData.items():
          # 先判断当前v中的type，大于两种直接跳过
          ts = set()
          for vi in v:
            ts.add(typeCheck(vi))
          if len(ts) > 1:
            continue

          if isinstance(v[0], list) or isinstance(v[0], dict):
            setv = list(v for v,_ in itertools.groupby(v))
          else:
            setv = set(v)
          if len(setv) == 1 and len(v) == dataLen:
            res['allDup'] = True
            res['allDupChild'].append(k)
            continue
          elif len(setv) <= dataLen * ratio:
            res['partialDup'] = True
            res['partialDupChild'].append(k)
            continue
      
      return res

    if p != '{}' and p != '[]':
      if typeCheck(tmpData) == 'a':
        tmpData = [[v for v in tmpData if p in v]]
      elif typeCheck(tmpData) == 'd':
        tmpData = [tmpData[p]]


  return res

def checkInconsistentStructure(root):
  idx = root['idx']
  tfreq = Counter(root['type'])

  if (tfreq['d'] >= 1 and tfreq['a'] >= 1):
    idxc = [i for i in range(len(root['type'])) if root['type'][i] == 'a' or root['type'][i] == 'd']
    
    # 每个substructure应当都有子节点，排除为a但是空的情况
    childPIdx = [c['parentIndex'] for c in root['children']]
    for ic in idxc:
      if ic not in childPIdx:
        return

    targetc = [c['idx'] for c in root['children'] if c['parentIndex'] in idxc]

    propc = [reduce(lambda x,y: x+y, c['typeProp'], 0) for c in root['children'] if c['parentIndex'] in idxc]
    data = {}
    for i in range(len(propc)):
      n = 'sub-structure' + str(i)
      data[n] = propc[i]

    res = [idx]
    res.extend(targetc)
    desc = [root['key']] # 只放父亲节点
    updateIssueList(consistency, inconsistentStructure, res, desc, data)

# def checkRedundantKey(root):
#   dt = [i for i in range(len(root['type'])) if root['type'][i] == 'd']

#   for pi in dt:
#     # 找当parentIndex为pi的所有children
#     dtc = [c for c in root['children'] if c['parentIndex'] == pi]
#     # 暂时只考虑基础数据类型
#     nodes = list(range(len(dtc)))
#     edges = []
#     for i in range(len(dtc)):
#       if len(dtc[i]['type']) > 1: continue
#       for j in range(i+1, len(dtc)):
#         if len(dtc[j]['type']) > 1: continue

#         if dtc[i]['type'][0] not in tuple(['b', 'a', 'd']) and dtc[j]['type'][0] not in tuple(['b', 'a', 'd']) and dtc[i]['data'] == dtc[j]['data']: # 按照数据对key分组
#           edges.append([i, j])
    
#     conG = connected_group(nodes, edges)

#     for gi in conG:
#       if len(gi) <= 1: continue
#       currentGIdx = [dtc[i]['idx'] for i in gi]
#       desc = [dtc[i]['key'] for i in gi]
#       updateIssueList(redundancy, redundantKey, currentGIdx, desc, {'redundantKey': len(currentGIdx), 'others': len(dtc) - len(currentGIdx)})

def memoArrayDict():
  for node in nodelist:
    apos = [i for i in range(len(node['type'])) if node['type'] == ['a']]
    for ai in apos:
      acd = [c['idx'] for c in node['children'] if c['parentIndex'] == ai and c['type'] == ['d']]
      if len(acd) == 0:
        continue
      dHaveParenta.extend(acd)
    
    if 'a' in node['type']:
      arrays.append(node['idx'])
    
    if 'd' in node['type']:
      dicts.append(node['idx'])

def generatePath(path, tmp):
  while tmp['parentId'] != None:
    if tmp['key']:
      parentIdentifier = tmp['key']
      path.append(parentIdentifier)
      if tmp['parentId'] != 0:
        path.append("{}")
    elif tmp['parentId'] != 0:
      if nodelist[tmp['parentId']]['type'][tmp['parentIndex']] == 'a':
        parentIdentifier = "[]"
      else:
        parentIdentifier = "{}"
      path.append(parentIdentifier)
    tmp = nodelist[tmp['parentId']]
  
  if nodelist[0]['type'] == ['d']:
    path.append("{}")
  else:
    path.append("[]")

def resolvePathAndCheck(originalData):
  for idx in dHaveParenta:
    path = []
    path.append("{}")
    generatePath(path, nodelist[idx])
    path.reverse()

    partialall = checkPartialAllDuplicateOfPath(originalData, path)
    add = lambda x, y: x + len(y)
    if partialall['allDup']:
      aa = [c['idx'] for c in nodelist[idx]['children'] if c['key'] in partialall['allDupChild']]
      ada = [reduce(add, c['data'], 0) for c in nodelist[idx]['children'] if c['key'] in partialall['allDupChild']]
      allda = reduce(add, nodelist[idx]['data'], 0)
      for i, childIdx in enumerate(aa):
        updateIssueList(duplicate, allDuplicate, [idx, childIdx], [nodelist[idx]['key'] if nodelist[idx]['key'] else '{}', nodelist[childIdx]['key'], ','.join(nodelist[childIdx]['type'])], {'current': ada[i], 'others': allda-ada[i]})
    if partialall['partialDup']:
      ap = [c['idx'] for c in nodelist[idx]['children'] if c['key'] in partialall['partialDupChild']]
      adp = [reduce(add, c['data'], 0) for c in nodelist[idx]['children'] if c['key'] in partialall['partialDupChild']]
      alldp = reduce(add, nodelist[idx]['data'], 0)
      for i, childIdx in enumerate(ap):
        updateIssueList(duplicate, partialDuplicate, [idx, childIdx], [nodelist[idx]['key'] if nodelist[idx]['key'] else '{}', nodelist[childIdx]['key'], ','.join(nodelist[childIdx]['type'])], {'current': adp[i], 'others': alldp-adp[i]})

  for idx in arrays:
    path = []
    generatePath(path, nodelist[idx])
    path.reverse()
    # 会出现#;的情况，不能用字符串相似度比较
    for p in arraysPath:
      if len(p) != len(path):
        continue

      flag = True
      for p1, p2 in zip(p, path):
        if p1 != p2 and p1 not in p2.split("#;"):
          flag = False
          break
      
      if flag:
        # 遍历idx节点所有的类型为a的dataPath，找出含有重复值的数据个数，与总个数相比较
        iofa = [i for i, c in enumerate(nodelist[idx]['type']) if c == 'a']
        iofd = [nodelist[idx]['dataPath'][i] for i in iofa]
        add = lambda x, y: x + len(y)
        allena = reduce(add, iofd, 0)
        dupcnt = 0
        for i in iofa:
          for di in nodelist[idx]['dataPath'][i]: # 路径数组
            tmp = originalData
            for dij in di:
              tmp = tmp[dij] # 拿到对应路径下的数据
            
            rd = list(v for v,_ in itertools.groupby(tmp))
            if len(rd) < len(tmp):
              dupcnt += 1

        updateIssueList(duplicate, dupInArray, [idx], [p[-1]], {'Duplicate': dupcnt, 'Others': allena-dupcnt}) # 待确定
        break
  
  for idx in dicts:
    path = []
    generatePath(path, nodelist[idx])
    path.reverse()
    for p in dictsPath:
      if len(p) != len(path):
        continue
      
      flag = True
      for p1, p2 in zip(p, path):
        if p1 != p2 and p1 not in p2.split("#;"):
          flag = False
          break
      
      if flag:
        # 遍历idx所有节点类型为d的dataPath，找出dict下value都相同的数据个数，与总个数比较
        iofd = [i for i, c in enumerate(nodelist[idx]['type']) if c == 'd']
        iofdd = [nodelist[idx]['dataPath'][i] for i in iofd]
        add = lambda x, y: x + len(y)
        allend = reduce(add, iofdd, 0)
        dupcnt = 0
        for i in iofd:
          for di in nodelist[idx]['dataPath'][i]: # 路径数组
            tmp = originalData
            for dij in di:
              tmp = tmp[dij]

            # 此时tmp是个字典，需要拿到value
            rd = list(v for v,_ in itertools.groupby(tmp.values()))
            if len(rd) == 1:
              dupcnt += 1
        updateIssueList(duplicate, fieldWithSameValue, [idx], [p[-1]], {'Same value count': dupcnt, 'others': allend - dupcnt})
        break

def assignIdx(root):
  dq = deque()
  global nodelist
  nodelist = list()
  idx = 0
  dq.append(root)
  root['parentId'] = None

  while dq:
    sz = len(dq)
    for _ in range(0, sz):
      topop = dq[0]
      nodelist.append(topop)
      topop['idx'] = idx
      for ci in topop['children']:
        ci['parentId'] = idx
        dq.append(ci)
      dq.popleft()
      idx += 1


def traverse(root):
  if not root:
    return
  
  for c in root['children']:
    traverse(c)
  
  checkEmpty(root)
  checkNull(root)
  checkInconsistentType(root)
  checkHierarchicalKey(root)
  checkInconsistentKey(root)
  checkDataAssociations(root)
  checkRedundantPaddingAndIncorrectDataType(root)
  checkMissingKey(root)
  checkRedundantInterior(root)
  checkRedundantExterior(root)
  checkInconsistentStructure(root)
  # checkRedundantKey(root)


def issueList(visTree, originalData):
  # 先要为每个节点赋予id
  global issues
  issues = {
    consistency: {
      "type": consistency,
      "count": 0,
      "details": {},
    },
    duplicate: {
      "type": duplicate,
      "count": 0,
      "details": {},
    },
    redundancy: {
      "type": redundancy,
      "count": 0,
      "details": {},
    },
    completeness: {
      "type": completeness,
      "count": 0,
      "details": {},
    },
    accuracy: {
      "type": accuracy,
      "count": 0,
      "details": {
      }
    },
    schema: {
      "type": schema,
      "count": 0,
      "details": {
      }
    },
  }

  # 用于检测partial和all duplicate的路径
  global dHaveParenta
  dHaveParenta = []
  global arrays
  arrays = []
  global dicts
  dicts = []
  global dictsPath 
  dictsPath = []
  global arraysPath
  arraysPath = []

  traverseData(originalData, [])

  assignIdx(visTree)

  # 需要在原数据中查找的issue在这里检测
  memoArrayDict()
  resolvePathAndCheck(originalData)

  #直接在visTree中查找在这里检测
  traverse(visTree)

  copyIssue = copy.deepcopy(issues)
  issuetypes = list(copyIssue.values())
  for t in issuetypes:
    specificKeys = list(t['details'].keys())
    currentTLocs = []
    currentTDesc = []
    currentTRep = []
    for k in specificKeys:
      currentTLocs.append(t['details'][k]['loc'])
      currentTDesc.append(t['details'][k]['des'])
      currentTRep.append(t['details'][k]['rep'])
    
    t['details'] = specificKeys
    t['locations'] = currentTLocs
    t['description'] = currentTDesc
    t['representation'] = currentTRep

  
  # print(json.dumps(issuetypes, indent=2))
  return issuetypes
  

if __name__ == '__main__':
  filePath = '{root}/data/case{number}/data.json'.format(root=os.getcwd(), number=2)
  with open(filePath, 'r') as file:
    jsonData = json.load(file)
  _, agg_vis_tree = aggregated_schema(jsonData, 1, 0.5)

  # assignIdx(agg_vis_tree)
  # print(json.dumps(agg_vis_tree, indent=2))
  # issueList(agg_vis_tree, jsonData)

  res = issueList(agg_vis_tree, jsonData)
  print(json.dumps(res, indent=2))

  # print("dictsPath", dictsPath)
  # # print("arraysPath", arraysPath)
  # print("dictpathintree", dictsPath)
  # # print("arraypathintree", arraysPath)
  # # print(arraysPath)