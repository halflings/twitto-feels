import json
from flask import Flask, request, abort
from flask.ext.restful import Resource, Api
from mongoengine import connect
from models import Tweet, Topic
from models.routing import register_api_model
from collecting.routes import CollectorListResource, CollectorResource
import config

app = Flask(__name__, static_url_path='')
api = Api(app, prefix='/api')

connect(config.db_name, host=config.db_host, port=config.db_port,
        username=config.db_user, password=config.db_pass)

@app.route('/')
def index():
    return app.send_static_file('index.html')

# register api models
register_api_model(api, Topic)
register_api_model(api, Tweet)

api.add_resource(CollectorListResource, '/collectors')
api.add_resource(CollectorResource, '/collectors/<topic_pk>')

if __name__ == '__main__':
    import sys
    app.run(debug='--debug' in sys.argv)
