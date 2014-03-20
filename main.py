import os
import sys
import time
import signal
import multiprocessing as mp
import tweepy
from mongoengine import connect, ValidationError
from mongoengine.errors import OperationError
from models import Tweet, Topic
from collecting import collect_for_topic
import config

def tweet_handler(tweet):
    if topic.locations and not tweet.location:
        return
    try:
        tweet.save()
        print 'Saved: https://twitter.com/%s/status/%s' % (tweet.user, tweet.tweet_id)
    except (ValidationError, OperationError) as e:
        print 'Not saved:', e

def run_topic_collector(topic, create=False):
    connect(config.db_name, host=config.db_host, port=config.db_port,
            username=config.db_user, password=config.db_pass)
    try:
        topic = Topic.objects.get(name=topic['name'])
    except Topic.DoesNotExist:
        if not create:
            print 'Topic does not exist, aborting...'
            return
        topic = Topic(**topic)
        topic.save()

    print 'Collector started (pid={})'.format(os.getpid())
    collect_for_topic(auth, topic, tweet_handler)

if __name__ == '__main__':
    # connect to twitter
    auth = tweepy.OAuthHandler(config.consumer_key, config.consumer_secret)
    auth.set_access_token(config.access_token_key, config.access_token_secret)

    # ready, set, go!
    #topics = []
    #pool = mp.Pool()
    #print 'Collectors started, kill with Ctrl-C'
    #pool.map(run_topic_collector, topics)
    run_topic_collector({ 'name': 'Happiness in SF' })
