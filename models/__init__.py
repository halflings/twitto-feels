from mongoengine import Document, fields, ValidationError

class Topic(Document):
    """
    Topic database model, giving a name to a topic which needs tracking (via a
    listener); useful for tweet classifying.
    """
    name = fields.StringField(unique=True, required=True)
    tags = fields.ListField(fields.StringField())
    locations = fields.ListField(fields.FloatField())

    def clean(self):
        """
        Ensure that the "locations" member corresponds to one or many bounding
        boxes, that is a list of 4n floats. Also validate the order of
        positions in the bounding box: south-west before north-east.
        """
        if len(self.locations) % 4 != 0:
            msg = 'Length of "locations" should be a multiple of 4'
            raise ValidationError(msg)
        xs, ys = self.locations[::2], self.locations[1::2]
        def pairs(ls):
            for i in xrange(0, len(ls), 2):
                yield ls[i:i+2]
        if not all(map(lambda p: \
                p[0][0] < p[1][0] # x1 < x2
                and \
                p[0][1] < p[1][1], # y1 < y2
                pairs(zip(xs, ys)))):
            msg = 'Bounding box order should be south-west then north-east'
            raise ValidationError(msg)

    def __str__(self):
        return '<{} - {}>'.format(self.name, self.tags)

    __repr__ = __str__

class Tweet(Document):
    """
    Tweet database model, holding some basic information which we really need
    for applying a data mining algorithm on a topic's positivity. It can be
    built from a raw tweet (from Twitter's API), using the make_tweet() helper,
    or the from_raw_tweet() classmethod.
    """
    topic = fields.ReferenceField(Topic, required=True)

    tweet_id = fields.IntField()
    status = fields.StringField()
    hashtags = fields.ListField(fields.StringField())
    user = fields.StringField()
    location = fields.ListField(fields.FloatField())

    def clean(self):
        if len(self.location) > 0 and len(self.location) != 2:
            msg = 'Location should be either empty or (x, y) position'
            raise ValidationError(msg)

    @classmethod
    def from_raw_tweet(self, data):
        return make_tweet(data)

    def __str__(self):
        return '<@%s> - "%s"' % (self.user, self.status)

    __repr__ = __str__

class TweetPolarity(Document):
    tweet = fields.ReferenceField(Tweet, required=True)
    polarity = fields.FloatField(required=True)

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
    tweet.status = _preprocess_text(data['text'])
    tweet.hashtags = map(lambda hs: _preprocess_text(hs['text']), data['entities']['hashtags'])
    tweet.user = _preprocess_text(data['user']['screen_name'])
    tweet.tweet_id = int(data['id_str'])
    if data['geo'] is not None and 'type' in data['geo'] \
            and data['geo']['type'] == 'Point':
        tweet.location = map(float, data['geo']['coordinates'])
    if save:
        tweet.save()
    return tweet
