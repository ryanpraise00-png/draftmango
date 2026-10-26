import json
from unittest.mock import patch, MagicMock
from urllib.error import URLError
from django.test import TestCase, override_settings
from .tests import AccountTests
from .models import Project, PublishedRelease

TOKEN='test-only-react-build-token-0000000000'
@override_settings(PUBLISHING_ENABLED=True,PUBLISHING_TOKEN=TOKEN,BUILD_TOKEN=TOKEN,PUBLISHING_BASE_DOMAIN='draftmango.com',PASSWORD_HASHERS=['django.contrib.auth.hashers.MD5PasswordHasher'])
class ReactPublishingTests(TestCase):
    setUp=AccountTests.setUp
    csrf=AccountTests.csrf
    send=AccountTests.send
    signup=AccountTests.signup
    secret=AccountTests.secret
    def prepare(self):
        self.signup()
        self.files={'src/App.jsx':'export default function App(){return <h1>React</h1>}', 'src/main.jsx':'import App from "./App.jsx"', 'src/styles.css':'body{margin:0}'}
        doc={'id':'react-project','title':'React','history':[{'design':{}}],'messages':[],'files':self.files}
        result=self.send(self.client,'/api/projects',{'project_id':'react-project','project_document':doc,'expected_version':0},'put')
        self.assertEqual(result.status_code,201,result.content)
    def publish(self,**extra):
        return self.send(self.client,'/api/publishing/sites',{'action':'publish','projectId':'react-project','slug':'react-site','expectedRevision':0,'expectedProjectVersion':1,'confirmed':True,**extra})
    @patch('accounts.publishing.urlopen')
    def test_builds_only_authoritative_source_and_stores_only_compiled_assets(self,request):
        self.prepare()
        compiled={'index.html':'<!doctype html><h1>Compiled</h1>','assets/site.js':'console.log("React bundle")','assets/site.css':'body{margin:0}'}
        response=MagicMock();response.read.return_value=json.dumps({'files':compiled}).encode();request.return_value.__enter__.return_value=response
        result=self.publish(files={'index.html':'UNTRUSTED browser build'})
        self.assertEqual(result.status_code,200,result.content)
        sent=request.call_args.args[0]
        self.assertEqual(json.loads(sent.data),{'files':self.files})
        self.assertEqual(set(PublishedRelease.objects.get().files),set(compiled))
        self.assertEqual(Project.objects.get().document['files'],self.files)
    @patch('accounts.publishing.urlopen',side_effect=URLError('Unavailable'))
    def test_failed_build_leaves_source_and_public_release_unchanged(self,request):
        self.prepare();result=self.publish()
        self.assertEqual(result.status_code,503)
        self.assertFalse(PublishedRelease.objects.exists())
        self.assertEqual(Project.objects.get().document['files'],self.files)
    @patch('accounts.publishing.urlopen')
    def test_stale_source_is_rejected_before_compiling(self,request):
        self.prepare();self.assertEqual(self.publish(expectedProjectVersion=999).status_code,409)
        request.assert_not_called()
