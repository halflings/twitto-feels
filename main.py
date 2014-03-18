import os
import time
import signal
import multiprocessing as mp
import tweepy
from mongoengine import connect
from models import Tweet, Topic
from collecting import collect_for_topic
import config

def run_topic_collector(topic):
    """
    Run a collector for the given topic tuple (name, tags)
    """
    # connect to mongo
    connect(config.db_name, host=config.db_host, port=config.db_port,
            username=config.db_user, password=config.db_pass)
    try:
        topic = Topic.objects.get(name=topic['name'])
    except Topic.DoesNotExist:
        topic = Topic(**topic)
        topic.save()

    print 'Collector started (pid={})'.format(os.getpid())
    collect_for_topic(auth, topic)

if __name__ == '__main__':
    # connect to twitter
    auth = tweepy.OAuthHandler(config.consumer_key, config.consumer_secret)
    auth.set_access_token(config.access_token_key, config.access_token_secret)

    # topics to follow
    topics = [
            {
            'name': 'American sports',
            'tags': ['basketball', 'football', 'baseball', 'hockey'],
            'locations': [-96.647415, 44.566715, -96.630435, 44.578118]
            },
            ]

    # ready, set, go!
    import sys
    if '--no-async' in sys.argv:
        print 'No async: running only for first topic'
        run_topic_collector(topics[0])
    else:
        pool = mp.Pool()
        print 'Collectors started, kill with Ctrl-C'
        pool.map(run_topic_collector, topics)
