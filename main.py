import os
import time
import signal
import multiprocessing as mp
import tweepy
from mongoengine import connect
from models import Tweet, Topic
import config

def run_topic_collector(topic_tuple):
    """
    Run a collector for the given topic tuple (name, tags)
    """
    # connect to mongo
    connect(config.db_name, host=config.db_host, port=config.db_port,
            username=config.db_user, password=config.db_pass)
    topic = Topic.objects.get_or_create(name=topic_tuple[0],
            defaults={ 'tags': topic_tuple[1] })[0]

    print 'Collector started (pid={})'.format(os.getpid())
    collect_for_topic(auth, topic)

if __name__ == '__main__':
    # connect to twitter
    auth = tweepy.OAuthHandler(config.consumer_key, config.consumer_secret)
    auth.set_access_token(config.access_token_key, config.access_token_secret)

    # topics to follow
    topics = (
            ('Happiness', ['happy']),
            ('American sports', ['football', 'baseball', 'hockey']),
            )

    # ready, set, go!
    pool = mp.Pool()
    print 'Collectors started, kill with Ctrl-C'
    pool.map(run_topic_collector, topics)
