import json
from flask import Flask
from flask.ext.restful import abort, Api, Resource
from mongoengine import connect
from models import Tweet, Topic
import config

app = Flask(__name__)
api = Api(app)

connect(config.db_name, host=config.db_host, port=config.db_port,
        username=config.db_user, password=config.db_pass)

class TopicsResource(Resource):
    def get(self):
        return json.loads(Topic.objects.to_json())
api.add_resource(TopicsResource, '/topics')

class TweetsResource(Resource):
    def get(self):
        return json.loads(Tweet.objects.to_json())
api.add_resource(TweetsResource, '/tweets')

@app.route('/')
def index():
    return app.send_static_file('index.html')

if __name__ == '__main__':
    import sys
    app.run(debug='--debug' in sys.argv)
