import json
from flask import Flask, request
from flask.ext.restful import Resource
from mongoengine import connect
from models import Tweet, Topic
from models.routing import ModelApi
import config

app = Flask(__name__, static_url_path='')
api = ModelApi(app, prefix='/api')

connect(config.db_name, host=config.db_host, port=config.db_port,
        username=config.db_user, password=config.db_pass)

api.register_model(Topic)
api.register_model(Tweet)

@app.route('/')
def index():
    return app.send_static_file('index.html')

if __name__ == '__main__':
    import sys
    app.run(debug='--debug' in sys.argv)
