#!/usr/bin/env python
# -*- coding: utf-8 -*-

import tweepy
import json

import config
from tweet import Tweet

auth1 = tweepy.OAuthHandler(config.consumer_key, config.consumer_secret)
auth1.set_access_token(config.access_token_key, config.access_token_secret)

class StreamListener(tweepy.StreamListener):
    def on_error(self, status_code):
        print 'Error: ' + repr(status_code)
        return False

    def on_data(self, data):
        d = json.loads(data)
        tweet = Tweet(d)
        print tweet
        pass

l = StreamListener()
streamer = tweepy.Stream(auth=auth1, listener=l)

tags = ['happy']
streamer.filter(track=tags)
