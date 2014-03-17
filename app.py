import json
from flask import Flask, request
from flask.ext.restful import abort, Api, Resource
from mongoengine import connect
from models import Tweet, Topic
import config

app = Flask(__name__, static_url_path='')
api = Api(app, prefix='/api')

connect(config.db_name, host=config.db_host, port=config.db_port,
        username=config.db_user, password=config.db_pass)

def mongo_to_dict(mongo_obj):
    return json.loads(mongo_obj.to_json())

def mongo_get_or_abort(document_cls, pk, *args, **kwargs):
    try:
        return document_cls.objects.get(pk=pk, *args, **kwargs)
    except document_cls.DoesNotExist:
        abort(404)

topic_public_fields = ('name', 'tags')
class TopicResource(Resource):
    def get(self, topic_id):
        return mongo_to_dict(mongo_get_or_abort(Topic, topic_id))

    def put(self, topic_id):
        topic = mongo_get_or_abort(Topic, topic_id)
        topic = Topic.objects.get(pk=topic_id)
        topic.update(**{ x: request.form[x] for x in topic_public_fields })
        topic.save()
        return mongo_to_dict(topic)

    def delete(self, topic_id):
        topic = mongo_get_or_abort(Topic, topic_id)
        topic.delete()
api.add_resource(TopicResource, '/topics/<topic_id>')

class TopicsResource(Resource):
    def get(self):
        return mongo_to_dict(Topic.objects)

    def post(self):
        topic = Topic(**{ x: request.form[x] for x in topic_public_fields })
        topic.save()
        return mongo_to_dict(topic)
api.add_resource(TopicsResource, '/topics')

class TweetResource(Resource):
    def get(self, tweet_id):
        return mongo_to_dict(mongo_get_or_abort(Tweet, tweet_id))

    def delete(self, tweet_id):
        tweet = mongo_get_or_abort(Tweet, tweet_id)
        tweet.delete()
api.add_resource(TweetResource, '/tweets/<tweet_id>')

class TweetsResource(Resource):
    def get(self):
        return mongo_to_dict(Tweet.objects)
api.add_resource(TweetsResource, '/tweets')

@app.route('/')
def index():
    return app.send_static_file('index.html')

if __name__ == '__main__':
    import sys
    app.run(debug='--debug' in sys.argv)
