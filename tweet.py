def preprocess_text(text):
    text = text.encode('utf-8').strip().lower()
    return text

class Tweet(object):
    def __init__(self, data):
        self.data = data
        self.user = preprocess_text(data['user']['screen_name'])
        self.text = preprocess_text(data['text'])

    def __str__(self):
        return '<@{}> - "{}"'.format(self.user, self.text)

    __repr__ = __str__
