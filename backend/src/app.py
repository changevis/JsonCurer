from flask import Flask, flash, request, redirect, jsonify, send_file
import os
from werkzeug.utils import secure_filename
from schemaSimGen import aggregated_schema
from nodeReordering import node_reordering
from issueCheck import issueList, typeCheck
from issueTransform import transformResult
import json

app = Flask(__name__, static_folder="../data")

UPLOAD_FOLDER = os.getcwd() + '/data'
ALLOWED_EXTENSIONS = {'json'}

app.secret_key = "test serect key"
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['SESSION_TYPE'] = "filesystem"


def allowedFile(filename):
  return '.' in filename and \
    filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


@app.route("/")
def hello():
  return os.getcwd() + " is current working dir."


@app.route("/uploadFile", methods=['POST'])
def uploadFile():
  file = request.files['file']
  dictSim = float(request.form['dictSim'])
  arrSim = float(request.form['arrSim'])


  if file and allowedFile(file.filename):

    fileContent = file.read() 
    content = json.loads(fileContent.decode())

    _, visTree = aggregated_schema(content, dict_sim=dictSim, arr_sim=arrSim)
    
    try:
      issuetypes = issueList(visTree, content)
    except Exception as e:
      issuetypes = []

    visTree, issuetypes = node_reordering(visTree, issuetypes)
    spec = json.dumps(visTree, indent=2)
    # issuetypes = []
    issue = json.dumps(issuetypes, indent=2)
    

    return jsonify({"specInfo": spec, "issueInfo": issue})


@app.route("/showcase", methods=['POST', 'GET'])
def getCasData():
  caseFolder = request.form['case']
  dictSim = float(request.form['dictSim'])
  arrSim = float(request.form['arrSim'])

  fileDir = os.path.join(app.static_folder, caseFolder)
  dataPath = os.path.join(fileDir, 'data.json')

  responseData = {}
  try:
    with open(dataPath) as f:
      content = json.load(f)
      _, visTree = aggregated_schema(content, dict_sim=dictSim, arr_sim=arrSim)
      
      try:
        issuetypes = issueList(visTree, content)
      except Exception as e:
        issuetypes = []

      visTree, issuetypes = node_reordering(visTree, issuetypes)

      responseData["specInfo"] = json.dumps(visTree, indent=2)
      responseData["dataInfo"] = json.dumps(content, indent=2)
      responseData['issueInfo'] = json.dumps(issuetypes, indent=2)
  except Exception as e:
    return jsonify({"error": str(e)})
  
  return jsonify(responseData)


@app.route("/updateSchema", methods=['POST'])
def updateSchema():
  dictSim = float(request.form['dictSim'])
  arrSim = float(request.form['arrSim'])
  jsonData = json.loads(request.form['jsonData'])
  responseData = {}
  
  _, visTree = aggregated_schema(jsonData, dict_sim=dictSim, arr_sim=arrSim)
  try:
    issuetypes = issueList(visTree, jsonData)
  except Exception as e:
    issuetypes = []

  visTree, issuetypes = node_reordering(visTree, issuetypes)

  responseData["specInfo"] = json.dumps(visTree, indent=2)
  responseData['issueInfo'] = json.dumps(issuetypes, indent=2)

  return jsonify(responseData)


@app.route("/transformationPreview", methods=['POST'])
def transformJSON():
  file = request.files['file']
  fileContent = file.read()
  sourceJson = json.loads(fileContent.decode())

  issueType = request.form['issueType']
  params = request.form['parameters']
  dataPath = request.form['dataPath']
  nodeIds = request.form['nodeIds']
  transformMode = request.form['mode']

  responseData = {}
  diffJson, targetDesc = transformResult(issueType, params, dataPath, sourceJson, nodeIds, transformMode)
  responseData["diffJson"] = json.dumps(diffJson, indent=2)
  responseData["targetDesc"] = targetDesc
  return jsonify(responseData)

@app.route("/showDecorations", methods=['POST'])
def decorationDiff():
  jsonData = json.loads(request.form['jsonData'])
  dataPath = json.loads(request.form['pathData'])

  responseData = {}

  targetJson = json.loads(json.dumps(jsonData))
  REPLACE = 'X'
  replaceCount = 0
  shouldShift = False
  for di in dataPath:
    tmpGrandpa = targetJson
    # todo
    if len(di) == 0:
      continue
    if len(di) == 1:
      if typeCheck(di[0]) == 'n': # 说明是数组
        shouldShift = True
        for k, _ in targetJson[di[0]].items():
          targetJson[di[0]] = {REPLACE+str(replaceCount) if k == k1 else k1:v1 for k1, v1 in targetJson[di[0]].items()}
          replaceCount += 1
          break
      continue
    
    for dpi in di[:-2]:
      tmpGrandpa = tmpGrandpa[dpi]
    tmpFather = tmpGrandpa[di[-2]]
    value = tmpFather[di[-1]]
    if typeCheck(value) == 'd': # 当前点击的是个dict
      if typeCheck(tmpFather) == 'd': # 点击的父亲是个dict
        tmpGrandpa[di[-2]] = {REPLACE+str(replaceCount) if k == di[-1] else k:v for k, v in tmpFather.items()}
        replaceCount += 1
      elif typeCheck(tmpFather) == 'a': # 点击的父亲array
        shouldShift = True
        firstKey = ''
        for k, _ in value.items():
          firstKey = k
          break
        tmpGrandpa[di[-2]] = [{REPLACE+str(replaceCount) if k == firstKey else k:v for k, v in value.items()} if i == di[-1] else vi for i, vi in enumerate(tmpFather)]
        replaceCount += 1
    elif typeCheck(value) == 'a': # 当前点击的是array
      # for k, _ in tmpFather[di[-1]].items():
      #   tmpFather[di[-1]] = {REPLACE if k == k1 else k1:v1 for k1, v1 in tmpFather[di[-1]].items()}
      #   break
      tmpGrandpa[di[-2]] = {REPLACE+str(replaceCount) if k == di[-1] else k:v for k, v in tmpFather.items()}
      replaceCount += 1
    else: # 其他普通类型直接替换值
      tmpFather[di[-1]] = REPLACE + str(replaceCount)
      replaceCount += 1
  
  responseData['decorationContent'] = json.dumps(targetJson, indent=2)
  responseData['shiftFlag'] = shouldShift

  return responseData
  

if __name__ == '__main__':
  app.run(host='0.0.0.0', port=5000, debug=True)
