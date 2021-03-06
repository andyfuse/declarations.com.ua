import re
import json
from random import choice
from django.urls import reverse
from django.conf import settings
from django.http import HttpResponse, HttpResponseBadRequest, HttpResponseForbidden, HttpResponseNotAllowed
from django.views.decorators.csrf import csrf_exempt
from spotter.utils import reverse_qs
from chatbot.utils import ukr_plural, chat_response, simple_search, verify_jwt


COMMON_ANSWERS = (
    (re.compile('\?$'), "Вітаю, я бот для пошуку декларацій чиновників.\n\nHello, I'm bot for search of declarations of Ukrainian officials."),
    (re.compile('(hi|help|hello)$'), "Hello, I'm bot for search of declarations of Ukrainian officials. I don't speak English, please ask me in Ukrainian."),
    (re.compile('(вітаю|привіт)$'), 'Вітаю, я бот для пошуку декларацій. Яку декларацію ти шукаєш сьогодні?'),
    (re.compile('привет$'), 'Привет, я бот для поиска деклараций украинских чиновников. Я понимаю запросы только на украинском языке.'),
    (re.compile('дякую$'), ['Будь ласка.', 'Нема за що!', 'Користуйтесь на здоров\'я', 'Дякую, що користуєтесь.']),
    (re.compile('спасибо$'), ['Пожалуйста', 'Не за что', 'Чому не державною?']),
    (re.compile('слава україні'), 'Героям слава!')
)


def send_greetings(data):
    for member in data.get('membersAdded', []):
        if 'bot' in member.get('name', '').lower():
            continue
        data['from'] = {'id': data['conversation']['id']}
        message = 'Вітаю!\n\nЯку декларацію ти шукаєш сьогодні?'
        chat_response(data, message)
        # send greetings only once
        break


def join_res(d, keys, sep=' '):
    """template like join dict values in signle string, safe for nonexists keys"""
    return sep.join([str(d[k]) for k in keys if k in d and d[k]])


def search_reply(data):
    if not data.get('text') or len(data['text']) > 100:
        return chat_response(data, 'Не зрозумів, уточніть запит.')

    text = data['text'].strip(' .,;!\n').lower()

    for r, message in COMMON_ANSWERS:
        if r.match(text):
            if isinstance(message, (list, tuple, set)):
                message = choice(message)
            return chat_response(data, message)

    search = simple_search(data['text'])
    deepsearch = ''

    if search.found_total == 0:
        search = simple_search(data['text'], deepsearch=True)
        deepsearch = 'on'

    plural = ukr_plural(search.found_total, 'декларацію', 'декларації', 'декларацій')
    message = 'Знайдено {} {}'.format(search.found_total, plural)
    if search.found_total > 10:
        message += '\n\nПоказані перші 10'
    attachments = None

    if search.found_total:
        attachments = []
        for found in search:
            if 'date' in found.intro:
                found.intro.date = 'подана ' + str(found.intro.date)[:10]
            if 'corrected' in found.intro:
                if found.intro.corrected:
                    found.intro.corrected = 'Уточнена'
            # TODO replace EMAIL_SITE_URL -> SITE_URL
            url = settings.EMAIL_SITE_URL + reverse('details', args=[found.meta.id])
            att = {
                "contentType": "application/vnd.microsoft.card.hero",
                "content": {
                    "title": join_res(found.general, ('last_name', 'name', 'patronymic'), ' '),
                    "subtitle": join_res(found.intro, ('declaration_year', 'doc_type', 'corrected', 'date'), ', '),
                    "text": join_res(found.general.post, ('region', 'office', 'post'), ', '),
                    "buttons": [
                        {
                            "type": "openUrl",
                            "title": "Відкрити",
                            "value": url
                        }
                    ]
                }
            }
            if 'url' in found.declaration:
                button = {
                    "type": "openUrl",
                    "title": "Показати оригінал",
                    "value": found.declaration.url
                }
                att['content']['buttons'].append(button)

            attachments.append(att)

            if len(attachments) >= 10:
                # TODO replace EMAIL_SITE_URL -> SITE_URL
                url = settings.EMAIL_SITE_URL + reverse_qs('search',
                    qs={'q': data['text'], 'deepsearch': deepsearch})
                att = {
                    "contentType": "application/vnd.microsoft.card.hero",
                    "content": {
                        "title": "Більше декларацій",
                        "subtitle": "Щоб побачити більше перейдіть на сайт",
                        "buttons": [
                            {
                                "type": "openUrl",
                                "title": "Продовжити пошук на сайті",
                                "value": url
                            }
                        ]
                    }
                }
                attachments.append(att)
                break

    return chat_response(data, message, attachments=attachments)


@csrf_exempt
def messages(request):
    if request.method != 'POST':
        return HttpResponseNotAllowed(['POST'], 'Method Not Allowed')

    if len(request.body) < 100 or len(request.body) > 1000:
        return HttpResponseBadRequest('Bad Request')

    data = json.loads(request.body.decode('utf-8'))

    if not verify_jwt(request.META.get('HTTP_AUTHORIZATION', ' '), data):
        return HttpResponseForbidden('Forbidden')

    if data['type'] == 'conversationUpdate':
        send_greetings(data)

    elif data['type'] == 'message':
        search_reply(data)

    return HttpResponse('OK')
