#!/usr/bin/env python2
# -*- coding: utf-8 -*-

import sys
import tweepy
import json

import config
from tweet import Tweet

auth_ = tweepy.OAuthHandler(config.consumer_key, config.consumer_secret)
auth_.set_access_token(config.access_token_key, config.access_token_secret)

class StreamListener(tweepy.StreamListener):
    def on_error(self, status_code):
        print >> sys.stderr, 'Error:', status_code
        return False

    def on_data(self, raw_data):
        data = json.loads(raw_data)
        tweet = Tweet(data)
        self.on_tweet(tweet)

    def on_tweet(self, tweet):
        """
        Hanlder called when a new tweet is streamed, taking the associated
        Tweet object.
        """
        print tweet

if __name__ == '__main__':
    listener = StreamListener()
    streamer = tweepy.Stream(auth=auth_, listener=listener)

    tags = ['happy']
    streamer.filter(track=tags)
