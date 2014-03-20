from multiprocessing import Process, Event
from flask import abort
from flask.ext.restful import Resource
from mongoengine import ValidationError, connect
from mongoengine.errors import OperationError
import tweepy
from collecting import collect_for_topic
from models import Topic
from helpers import get_request_json
import config

collectors = {}

class CollectorProcess(Process):
    def __init__(self, topic):
        super(CollectorProcess, self).__init__()
        self.topic = topic
        self.should_stop = Event()

    def run(self):
        auth = tweepy.OAuthHandler(config.consumer_key,
                config.consumer_secret)
        auth.set_access_token(config.access_token_key,
                config.access_token_secret)
        connect(config.db_name, host=config.db_host, port=config.db_port,
                username=config.db_user, password=config.db_pass)
        collect_for_topic(auth, self.topic, self.handle_tweet)

    def handle_tweet(self, tweet):
        try:
            tweet.save()
            print 'Saved: https://twitter.com/%s/status/%s' % (tweet.user, tweet.tweet_id)
        except (ValidationError, OperationError) as e:
            print 'Not saved:', e
        return self.should_stop.is_set()

class CollectorListResource(Resource):
    def get(self):
        return collectors.keys()

    def post(self):
        data = get_request_json()
        if 'id' not in data:
            abort(400)
        if data['id'] in collectors:
            abort(403)
        topic_pk = data['id']
        try:
            topic = Topic.objects.get(pk=topic_pk)
        except (ValidationError, Topic.DoesNotExist):
            abort(404)
        collector_proc = CollectorProcess(topic)
        collectors[topic_pk] = collector_proc
        collector_proc.start()
        return data

class CollectorResource(Resource):
    def delete(self, topic_pk):
        if topic_pk not in collectors:
            abort(403)
        collector_proc = collectors[topic_pk]
        collector_proc.terminate()
        del collectors[topic_pk]
        collector_proc.join()
