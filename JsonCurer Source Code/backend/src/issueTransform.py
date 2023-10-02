import json
import issueCheck
from ast import literal_eval

inconsistentValue = 'Inconsistent Value'

mapLong = {
  'a': 'array',
  'n': 'number',
  's': 'string',
  'b': 'bool',
  'e': 'null',
  'd': 'dict',
}
def transformResult(issueType, params, dataPath, sourceJson, nodeIds, mode):
  paramParse = json.loads(params)
  dataPathParse = json.loads(dataPath)
  nodeIdsParse = json.loads(nodeIds)
  if (mode == 'single'):
    return transformResultSingle(issueType, paramParse, dataPathParse, sourceJson, nodeIds)
  elif (mode == 'batch'):
    tmpJson = sourceJson
    for i in range(len(dataPathParse)):
      dpiParse = json.loads(dataPathParse[i])
      ndiParse = json.loads(nodeIdsParse[i])
      tmpJson, opDesc = transformResultSingle(issueType, paramParse, dpiParse, tmpJson, ndiParse)
    
    return tmpJson, opDesc + ' batch processing'

def transformResultSingle(issueType, paramParse, dataPathParse, sourceJson, nodeIds):

  if issueType == issueCheck.inconsitentType:
    return inconsistentType(paramParse, dataPathParse, sourceJson)
  elif issueType== issueCheck.allDuplicate:
    return allDupKVP(paramParse, dataPathParse, sourceJson)
  elif issueType == issueCheck.dupInArray:
    return dupinA(paramParse, dataPathParse, sourceJson)
  elif issueType == issueCheck.redundantInterior:
    return redundantInterior(paramParse, dataPathParse, sourceJson)
  elif issueType == issueCheck.emptyValue:
    return emptyV(paramParse, dataPathParse, sourceJson, 'empty')
  elif issueType == issueCheck.missingValue:
    return emptyV(paramParse, dataPathParse, sourceJson, 'missing')
  elif issueType == issueCheck.hierKey:
    return hierKey(paramParse, dataPathParse, sourceJson)
  elif issueType == issueCheck.inconsistentStructure:
    return inconsistentS(paramParse, dataPathParse, sourceJson, nodeIds)
  elif issueType == inconsistentValue:
    return inconsistentV(paramParse, dataPathParse, sourceJson)
  elif issueType == issueCheck.inconsitentKey:
    return inconsistentK(paramParse, dataPathParse, sourceJson)
  elif issueType == issueCheck.missingKey:
    return missingK(paramParse, dataPathParse, sourceJson)
  elif issueType == issueCheck.incorrectDataType:
    return incorrectType(paramParse, dataPathParse, sourceJson)
  elif issueType == issueCheck.dataAssociations:
    return dataAssociation(paramParse, dataPathParse, sourceJson)
  elif issueType == issueCheck.redundantPaddding:
    return redundantPad(paramParse, dataPathParse, sourceJson)
  elif issueType == issueCheck.redundantKey:
    return redundantKey(paramParse, dataPathParse, sourceJson)

def getADeleteDesc(level):
  if level == 0:
    return 'itself'
  elif level == 1:
    return 'parent Node'
  elif level == 2:
    return '2nd ancestor'
  elif level == 3:
    return '3rd ancestor'
  else:
    return '{}nd ancestor'.format(level)

def inconsistentType(params, dataPath, sourceJson):
  diffJson = json.loads(json.dumps(sourceJson))
  isArraySplit = False
  for td in dataPath[0]:
    # 当前type的所有data路径
    for tdp in td:
      tmp = diffJson
      for pi in tdp[:-1]:
        tmp = tmp[pi]
      if issueCheck.typeCheck(tmp[tdp[-1]]) == params['targetType']:
        break

      if params['targetType'] == 's':
        if issueCheck.typeCheck(tmp[tdp[-1]]) == 'a':
          tmp[tdp[-1]] = tmp[tdp[-1]].join(params['jointBy'])
        else:
          tmp[tdp[-1]] = str(tmp[tdp[-1]])
      elif params['targetType'] == 'a':
        if issueCheck.typeCheck(tmp[tdp[-1]]) == 's':
          tmp[tdp[-1]] = tmp[tdp[-1]].split(params['splitBy'])
          isArraySplit = True
        else:
          tmp[tdp[-1]] = [tmp[tdp[-1]]]
  targetDesc = ""
  if params['targetType'] == 's':
    targetDesc = "convert to string concatenating by {}".format(params['jointBy'])
  elif params['targetType'] == 'a':
    targetDesc = "convert to array splitting by {}".format(params['splitBy']) if isArraySplit else "Conform to Type Array"
  return diffJson, targetDesc

def allDupKVP(params, dataPath, sourceJson):
  diffJson = json.loads(json.dumps(sourceJson))
  # dataPath是一个数组，第一个元素储存父亲的路径，第二个元素储存孩子的路径
  # deleteLevel 为0，表示删除孩子；为1表示删除孩子的父亲，以此类推
  flag = False
  for td in dataPath[1]:
    for tdp in td:

      if params['deleteLevel'] >= len(tdp):
        return None

      tmp = diffJson
      if params['deleteLevel'] == len(tdp)-1:
        if issueCheck.typeCheck(diffJson) == 'd':
          del tmp[tdp[0]]
        else: # 最外层是数组，不可以直接删除，要维护顺序
          flag = True
          tmp[tdp[0]] = None
        continue

      
      for pi in tdp[:-params['deleteLevel']-1]:
        tmp = tmp[pi]
      del tmp[tdp[-params['deleteLevel']-1]]
  
  if flag:
    diffJson = [k for k in diffJson if k]

  deleteDesc = getADeleteDesc(params['deleteLevel'])
  targetDesc = "delete {}".format(deleteDesc)
  return diffJson, targetDesc

def redundantInterior(params, dataPath, sourceJson):
  diffJson = json.loads(json.dumps(sourceJson))

  # dataPath[0]是对应父亲的路径，dataPath[1]是对应孩子的路径
  for td in dataPath[1]:
    for tdp in td:
      grandpaRef = diffJson
      for pi in tdp[:-2]:
        grandpaRef = grandpaRef[pi]
      
      childValue = grandpaRef[tdp[-2]][tdp[-1]]
      del grandpaRef[tdp[-2]]
      grandpaRef[params['newKey']] = childValue
  targetDesc = "delete redundant structure, assign new key name {}".format(params['newKey'])
  return diffJson, targetDesc

def emptyV(params, dataPath, sourceJson, mode):
  diffJson = json.loads(json.dumps(sourceJson))

  flag = False
  for td in dataPath[0]:
  # 当前type的所有data路径
    for tdp in td:
      tmp = diffJson
      for pi in tdp[:-1]:
        tmp = tmp[pi]

      if mode == 'empty' and tmp[tdp[-1]] != [] and tmp[tdp[-1]] != '' and tmp[tdp[-1]] != {}:
        break

      if params['transformBy'] == 'replace':
        # 转义为数组或对象
        try:
          check = literal_eval(params['replaceBy'])
          tmp[tdp[-1]] = check
        except:
          tmp[tdp[-1]] = params['replaceBy']
          continue
      elif params['transformBy'] == 'delete':
        flag = False
        if params['deleteLevel'] >= len(tdp):
          return None

        tmp = diffJson
        if params['deleteLevel'] == len(tdp)-1:
          if issueCheck.typeCheck(diffJson) == 'd':
            del tmp[tdp[0]]
          else: # 最外层是数组，不可以直接删除，要维护顺序
            flag = True
            tmp[tdp[0]] = None
          continue

        for pi in tdp[:-params['deleteLevel']-1]:
          tmp = tmp[pi]
        del tmp[tdp[-params['deleteLevel']-1]]
        
  if flag:
    diffJson = [k for k in diffJson if k]
  
  targetDesc = ""
  if params['transformBy'] == 'replace':
    targetDesc = "replace with {}".format(params['replaceBy'])
  elif params['transformBy'] == 'delete':
    deleteDesc = getADeleteDesc(params['deleteLevel'])
    targetDesc = "delete {}".format(deleteDesc)

  return diffJson, targetDesc

def dupinA(params, dataPath, sourceJson):
  diffJson = json.loads(json.dumps(sourceJson))

  return diffJson

def inconsistentS(params, dataPath, sourceJson, nodeIds):
  diffJson = json.loads(json.dumps(sourceJson))
  nodeIds = json.loads(nodeIds)

  targetS = params['targetStructure']
  mappings = params['mappings']

  for node in nodeIds[1:]: # 忽略父亲
    if node == targetS:
      continue
    mappingForThisNode = {k: v for k, v in mappings.items() if k.startswith(str(node))}

    source = []
    target = []
    for k, v in mappingForThisNode.items():
      s = k.split(':')
      l = v.split('.')
      targetPath = dataPath[nodeIds.index(int(s[1]))]
      sourcePath = dataPath[nodeIds.index(int(s[0]))]
      source.append(l[-1])
      target.append(s[-1])


    result = {}
    tmp = diffJson
    tmpKey = ''
    for dpi in sourcePath[0][0][:-2]: # 公共前缀
      tmp = tmp[dpi]
    tmpKey = sourcePath[0][0][-2]

    if isinstance(targetPath[0][0][-1], int):
      result = [] # 里面是对象
      
    for dp in sourcePath[0]:
      fatherTmp = diffJson
      for dpi in dp[:-1]:
        fatherTmp = fatherTmp[dpi]
      
      # 获取当前数据
      transPiece = {}
      if 'key' in source:
        transPiece[target[source.index('key')]] = dp[-1] # key名
        for s, t in zip(source, target):
          if s == 'key':
            continue
          transPiece[t] = fatherTmp[dp[-1]][s]
      
      result.append(transPiece)

     
    tmp[tmpKey] = result

  targetDesc = "mapping structures"
  return diffJson, targetDesc

def hierKey(params, dataPath, sourceJson):
  diffJson = json.loads(json.dumps(sourceJson))
  if params['transformBy'] == 'dict':
    for pi in dataPath:
      for di in pi[0]:
        tmp = diffJson
        for dpi in di[:-1]:
          tmp = tmp[dpi]
        # 获取到父亲所在位置
        if di[-1].startswith(params['newKeyName']):
          stripped = di[-1][len(params['newKeyName']):]
          if stripped[0] in tuple(['_', '-', ':']):
            stripped = stripped[1:]
          
          if params['newKeyName'] not in tmp:
            tmp[params['newKeyName']] = {
              stripped: tmp[di[-1]]
            }
          else:
            tmp[params['newKeyName']][stripped] = tmp[di[-1]]
        else:
          if params['newKeyName'] not in tmp:
            tmp[params['newKeyName']] = {
              di[-1]: tmp[di[-1]]
            }
          else:
            tmp[params['newKeyName']][di[-1]] = tmp[di[-1]]
        del tmp[di[-1]]
  elif params['transformBy'] == 'string':
    for i, pi in enumerate(dataPath):
      for di in pi[0]:
        tmp = diffJson
        for dpi in di[:-1]:
          tmp = tmp[dpi]
        if params['newKeyName'] not in tmp:
          tmp[params['newKeyName']] = str(tmp[di[-1]])
        else:
          tmp[params['newKeyName']] += params['joinBy'] + str(tmp[di[-1]])
        
        del tmp[di[-1]]


  targetDesc = ""
  if params['transformBy'] == 'dict':
    targetDesc = "convert to dict, assign new key name {}".format(params['newKeyName'])
  elif params['transformBy'] == 'string':
    targetDesc = "convert to string, assign new key name {}, and join by {}".format(params['newKeyName'], params['transformBy'])
  return diffJson, targetDesc

def inconsistentV(params, dataPath, sourceJson):
  diffJson = json.loads(json.dumps(sourceJson))
  vm = {item['from']: item['to'] for item in params}
  for pi in dataPath[0]:
    for di in pi:
      tmp = diffJson
      for dpi in di[:-1]:
        tmp = tmp[dpi]
      
      if tmp[di[-1]] not in vm:
        continue

      tmp[di[-1]] = vm[tmp[di[-1]]]

  tagrgetDesc = "Mapping values"
  return diffJson, tagrgetDesc

def inconsistentK(params, dataPath, sourceJson):
  diffJson = json.loads(json.dumps(sourceJson))
  for pi in dataPath:
    for pci in pi:
      for pcdi in pci:
        tmp = diffJson
        if pcdi[-1] == params['targetKey']:
          continue
        for pcdki in pcdi[:-1]:
          tmp = tmp[pcdki]
        
        tmp[params['targetKey']] = tmp[pcdi[-1]]
        del tmp[pcdi[-1]]
  targetDesc = "conform to key name {}".format(params['targetKey'])
  return diffJson, targetDesc

def missingK(params, dataPath, sourceJson):
  diffJson = json.loads(json.dumps(sourceJson))

  if params['transformBy'] == 'fill':
    for dp in dataPath[0]: # 只涉及一个节点
      for dpt in dp: # 当前节点可能有多个type
        # 获取爷爷路径
        tmp = diffJson
        for dptpi in dpt[:-2]: # 考虑第一个元素
          tmp = tmp[dptpi]
        targetKey = dpt[-1]

        if issueCheck.typeCheck(tmp) != 'a':
          break

        for gpc in tmp:
          if issueCheck.typeCheck(gpc) != 'd': # 看爷爷的孩子（一定是dict）下有没有当前key
            continue

          if targetKey in gpc:
            continue

          try:
            check = literal_eval(params['fillIn'])
            gpc[targetKey] = check
          except:
            gpc[targetKey] = None if params['fillIn'] == 'null' else params['fillIn']

  elif params['transformBy'] == 'delete':
    mergedPath = []
    for dpm in dataPath[0]:
      mergedPath.extend(dpm)

    tmpDelete = diffJson
    # 获取待删除节点的父亲
    for dptpi in mergedPath[0][:-params['deleteLevel']-1]:
      tmpDelete = tmpDelete[dptpi]
    
    existingIndexs = [i[-params['deleteLevel']-1] for i in mergedPath]
    MissingIndexes = [i for i in range(len(tmpDelete)) if i not in existingIndexs]

    arrFlag = False
    for mi in MissingIndexes:
      if params['deleteLevel'] >= len(dataPath[0][0]):
        diffJson = None
        break
      
      if params['deleteLevel'] == 1: # 删除当前d
        if issueCheck.typeCheck(tmpDelete) == 'a':
          arrFlag = True
        tmpDelete[mi] = None
      
      elif params['deleteLevel'] > 1:          
        if issueCheck.typeCheck(tmpDelete[-params['deleteLevel']]) == 'd':
          del tmpDelete[-params['deleteLevel']]
        elif issueCheck.typeCheck(tmpDelete[-params['deleteLevel']]) == 'a':
          arrFlag = True
          tmpDelete[-params['deleteLevel']] = None

    if arrFlag:
      tmpDelete = [t for t in tmpDelete if t]
      diffJson = [t for t in diffJson if t]

  targetDesc = ""
  if params['transformBy'] == 'fill':
    targetDesc = "fill the missing key with value {}".format(params['fillIn'])
  elif params['transformBy'] == 'delete':
    deleteDesc = getADeleteDesc(params['deleteLevel'])
    targetDesc = "delete {}".format(deleteDesc)
  return diffJson, targetDesc

def incorrectType(params, dataPath, sourceJson):
  diffJson = json.loads(json.dumps(sourceJson))
  t = params['targetType']

  for pi in dataPath[0]:
    for di in pi:
      tmp = diffJson
      for dpi in di[:-1]:
        tmp = tmp[dpi]
      sv = tmp[di[-1]]
      if issueCheck.typeCheck(sv) == 's':
        # 原来的是string，直接literal_eval看能否转换
        try: # 有可能是dict或者array
          check = literal_eval(sv)
          tmp[di[-1]] = check
        except:
          # 报错的话需要一一对应处理
          if t == 'n':
            tmp[di[-1]] = int(sv)
          elif t == 'b':
            if sv.upper() == 'TRUE' or sv == '1':
              tmp[di[-1]] = True
            elif sv.upper() == 'FALSE' or sv == '0':
              tmp[di[-1]] = False
          elif t == 'e':
            if sv.upper() == 'None' or sv.upper() == 'NULL' or sv.upper() == 'NAN':
              tmp[di[-1]] = None
          elif t == 'a' or t == 'd':
            raise Exception("Can't Tranform the Content!")
      elif issueCheck.typeCheck(sv) == 'a':
        if t == 's':
          tmp[di[-1]] = ', '.join(sv)
      elif issueCheck.typeCheck(sv) == 'b' or issueCheck.typeCheck(sv) == 'n':
        if t == 's':
          tmp[di[-1]] = str(sv)
  targetDesc = "convert to target type {}".format(mapLong[t])
  return diffJson, targetDesc


def dataAssociation(params, dataPath, sourceJson):
  diffJson = json.loads(json.dumps(sourceJson))
  t = params['nameForKey']
  for td in dataPath[0]:
    for tdp in td:
      tmp = diffJson
      for pi in tdp[:-2]:
        tmp = tmp[pi]
      
      if issueCheck.typeCheck(tmp[tdp[-2]]) != 'd':
        continue
      # 此时的tmp是一个字典
      target = []
      for k, v in tmp[tdp[-2]].items():
        obj = {}
        obj[t] = k
        for k1, v1 in v.items():
          obj[k1] = v1
        target.append(obj)
      
      tmp[tdp[-2]] = target

  targetDesc = "convert to value, assign with key {}".format(t)
  return diffJson, targetDesc

def redundantPad(params, dataPath, sourceJson):
  diffJson = json.loads(json.dumps(sourceJson))
  for dpt in dataPath[0]: # redundant padding 只涉及一个节点
    tmp = diffJson
    for dptij in dpt[0][:-1]:
      tmp = tmp[dptij]
    if issueCheck.typeCheck(tmp[dpt[0][-1]]) != 's':
      continue

    for dpti in dpt: # 某一个类的路径 # 此时总是字符串
      ntmp = diffJson
      for t in dpti[:-1]:
        ntmp = ntmp[t]
      ntmp[dpti[-1]] = ntmp[dpti[-1]].strip()

  targetaDesc = "remove redundant padding"
  return diffJson, targetaDesc

def redundantKey(params, dataPath, sourceJson):
  diffJson = json.loads(json.dumps(sourceJson))

  for idx in params['keysToDelete']:
    curIdxPath = dataPath[idx]
    for stp in curIdxPath:
      for stpi in stp:
        tmp = diffJson
        for p in stpi[:-1]:
          tmp = tmp[p]
        
        del tmp[stpi[-1]]

  targetDesc = "remove redundant key"
  return diffJson, targetDesc