from mongoengine import Document, fields

class Topic(Document):
    """
    Topic database model, giving a name to a topic which needs tracking (via a
    listener); useful for tweet classifying.
    """
    name = fields.StringField()
    tags = fields.ListField(fields.StringField)

    def __str__(self):
        return '<{} - {}>'.format(self.name, self.tags)

    __repr__ = __str__

class Tweet(Document):
    """
    Tweet database model, holding some basic information which we really need
    for applying a data mining algorithm on a topic's positivity. It can be
    built from a raw tweet (from Twitter's API), using the make_tweet() helper.
    """
    topic = fields.ReferenceField(Topic, required=True)

    # tweet information
    tweet_id = fields.IntField()
    text = fields.StringField()
    hashtags = fields.ListField(fields.StringField)

    # user information
    user = fields.StringField()
    user_id = fields.IntField()
    user_geo_enabled = fields.BooleanField()

    def __str__(self):
        return '<@{}> - "{}"'.format(self.user, self.text)

    __repr__ = __str__

def _preprocess_text(text):
    """
    Prepare a string for syntaxic treatment (encode to utf-8, remove
    leading/trailing whitespace, etc...).
    """
    return text.encode('utf-8').strip(' \t\r\n').lower()

def make_tweet(data, save=False):
    """
    Make a Tweet object, given a dictionary of raw tweet data.
    """
    tweet = Tweet()
    try:
        tweet.tweet_id = data['id']
    except KeyError:
        import pprint; pprint.pprint(data)
        raise
    tweet.text = _preprocess_text(data['text'])
    tweet.hashtags = map(lambda hs: _preprocess_text(hs['text']), data['entities']['hashtags'])
    tweet.user = _preprocess_text(data['user']['screen_name'])
    tweet.user_id = data['user']['id']
    tweet.user_geo_enabled = data['user']['geo_enabled']
    if save:
        tweet.save()
    return tweet
