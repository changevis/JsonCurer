# JsonCurer: Data Quality Management for JSON Based on an Aggregated Schema

This repository contains the source code for the paper titled "JsonCurer: Data Quality Management for JSON Based on an Aggregated Schema".

JsonCurer is an interactive visualization system that helps discover and fix quality issues in JSON data. We implement it as a client-server web-based application using Flask on the backend server and Vue and D3 on the frontend client.

## Project Setup

### Back End
- go to backend folder: `cd backend`
- create conda environment or venv with python 3.10
- install requirements: `pip install -r requirements.txt`
- run flask: `python src/app.py`

The backend by default runs on `localhost:5000`, make sure it is not occupied. If you want to change the flask running port, make sure simultaneously change it in both `backend/src/app.py` & `frontend/vue.config.js`.

### Front End
- go to frontend folder: `cd frontend`
- use `node --version` to check current node version, we expect it to be **19.5.0**. To install multiple version of node, we recommend using [nvm](https://github.com/nvm-sh/nvm).
- install dependencies: `npm install`
- run app: `npm run serve`

Now the project is running on your [localhost](http://localhost:8080/).