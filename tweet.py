def preprocess_text(text):
    """
    Prepare a string for syntaxic treatment (encode to utf-8, remove
    leading/trailing whitespace, etc...).
    """
    return text.encode('utf-8').strip(' \t\r\n').lower()

class Tweet(object):
    """
    Class handling object-oriented formatting of data received through
    Twitter's API. Raw data is accessible through the *raw_data* member.
    """
    def __init__(self, data):
        self.raw_data = data
        self.user = preprocess_text(data['user']['screen_name'])
        self.text = preprocess_text(data['text'])

    def __str__(self):
        return '<@{}> - "{}"'.format(self.user, self.text)

    __repr__ = __str__
