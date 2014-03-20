import json
from flask import Flask, request, abort
from flask.ext.restful import Resource, Api
from mongoengine import connect
from models import Tweet, Topic
from models.routing import register_api_model, ModelResource
from collecting.routes import CollectorListResource, CollectorResource
from helpers import get_request_json
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

class TweetQueryResource(ModelResource):
    def post(self):
        data = get_request_json()
        if 'topic' not in data:
            abort(400)
        return self.to_dict(Tweet.objects(topic=data['topic']))
api.add_resource(TweetQueryResource, '/tweets/query')

api.add_resource(CollectorListResource, '/collectors')
api.add_resource(CollectorResource, '/collectors/<topic_pk>')

if __name__ == '__main__':
    import sys
    app.run(debug='--debug' in sys.argv)
