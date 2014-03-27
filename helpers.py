import re
from flask import request, abort

def get_request_json(error_code=400):
    if not request.headers['Content-Type'].startswith('application/json'):
        abort(error_code)
    return request.get_json(force=True)

_punct_re = re.compile(r'[\t !"#$%&\'()*\-/<=>?@\[\\\]^_`{|},.]+')

_first_cap_re = re.compile('(.)([A-Z][a-z]+)')
_all_cap_re = re.compile('([a-z0-9])([A-Z])')
def slugify(text, delim='_'):
    sub_text = r'\1%s\2' % delim
    return _all_cap_re.sub(sub_text, _first_cap_re.sub(sub_text, text)).lower()

if __name__ == '__main__':
    slug_tests = {
            'Camel': 'camel',
            'CamelCase': 'camel_case',
            'MultipleCamelCase': 'multiple_camel_case',
            'ShortCC': 'short_cc',
            'SCC': 'scc',
            }
    assert all(slugify(i) == o for i, o in slug_tests.iteritems())
