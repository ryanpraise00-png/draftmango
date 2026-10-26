import json
from datetime import timedelta
from django.test import TestCase, Client, override_settings
from django.utils import timezone
from .models import User, Project, PublishedSite, PublishedRelease, PublishedAddress, BillingAccount
from .tests import AccountTests

TOKEN='test-only-private-publishing-service-token'
@override_settings(PUBLISHING_ENABLED=True,PUBLISHING_TOKEN=TOKEN,PUBLISHING_BASE_DOMAIN='draftmango.com',PASSWORD_HASHERS=['django.contrib.auth.hashers.MD5PasswordHasher'])
class PublishingTests(TestCase):
    setUp=AccountTests.setUp
    csrf=AccountTests.csrf
    send=AccountTests.send
    signup=AccountTests.signup
    secret=AccountTests.secret

    def source(self,client=None,project='site-one',version=0,text='First'):
        client=client or self.client
        doc={'id':project,'title':'A site','history':[{'design':{}}],'messages':[{'text':'Private chat'}],'workspace':{'notes':'Private notes'},'files':{'index.html':f'<!doctype html><title>Test</title><h1>{text}</h1>','styles.css':'h1{color:green}','app.js':'console.log("ok")','notes.md':'Private notes','package.json':'{}'}}
        return self.send(client,'/api/projects',{'project_id':project,'project_document':doc,'expected_version':version},'put')
    def publish(self,project='site-one',slug='mango-shop',version=1,revision=0,client=None,**extra):
        return self.send(client or self.client,'/api/publishing/sites',{'action':'publish','projectId':project,'slug':slug,'expectedProjectVersion':version,'expectedRevision':revision,'confirmed':True,**extra})
    def asset(self,host='mango-shop.draftmango.com',path='',token=TOKEN):
        return self.client.get('/internal/publishing/file',{'host':host,'path':path},HTTP_X_PUBLISHING_TOKEN=token)
    def prepare(self):self.signup();self.source()

    def test_publish_update_and_rollback_keep_draft_separate_from_public_release(self):
        self.prepare();r=self.publish();self.assertEqual(r.status_code,200,r.content);site=r.json()['site'];first=site['activeRelease']
        self.assertContains(self.asset(),'First');self.source(version=1,text='Second');self.assertContains(self.asset(),'First')
        r=self.publish(version=2,revision=1);self.assertEqual(r.status_code,200);self.assertContains(self.asset(),'Second')
        r=self.send(self.client,'/api/publishing/sites',{'action':'rollback','projectId':'site-one','releaseId':first,'expectedRevision':2,'confirmed':True})
        self.assertEqual(r.status_code,200);self.assertContains(self.asset(),'First');self.assertIn('Second',Project.objects.get().document['files']['index.html'])
    def test_publish_is_idempotent_for_identical_files(self):
        self.prepare();self.publish();r=self.publish(revision=1)
        self.assertTrue(r.json()['unchanged']);self.assertEqual(PublishedRelease.objects.count(),1)
    def test_unsynced_project_and_stale_public_revision_do_not_change_live_site(self):
        self.prepare();self.publish()
        self.assertEqual(self.publish(version=999,revision=1).status_code,409)
        self.assertEqual(self.publish(revision=0).status_code,409);self.assertEqual(PublishedRelease.objects.count(),1)
    def test_ownership_and_csrf_are_required(self):
        self.prepare();other=Client(enforce_csrf_checks=True);self.csrf(other);self.signup(other,'other@example.test')
        self.assertEqual(self.publish(client=other).status_code,404)
        self.assertEqual(self.client.post('/api/publishing/sites',json.dumps({'action':'publish'}),content_type='application/json').status_code,403)
    def test_active_site_limit_and_unpublish(self):
        self.prepare();self.publish();self.source(project='site-two')
        self.assertEqual(self.publish(project='site-two',slug='another-site').status_code,403)
        self.send(self.client,'/api/publishing/sites',{'action':'unpublish','projectId':'site-one','expectedRevision':1,'confirmed':True})
        self.assertEqual(self.asset().status_code,404)
        self.assertEqual(self.publish(project='site-two',slug='another-site').status_code,200)
    def test_deleting_from_workspace_unpublishes_and_frees_capacity(self):
        self.prepare();self.publish();project=Project.objects.get();doc=project.document;doc['workspace']['deleted']=True
        r=self.send(self.client,'/api/projects',{'project_id':project.project_id,'project_document':doc,'expected_version':project.version},'put')
        self.assertEqual(r.status_code,200);self.assertEqual(self.asset().status_code,404)
        self.assertIsNone(PublishedSite.objects.get().active_release_id)
        self.assertEqual(self.publish(version=2,revision=2).status_code,404)
        self.source(project='site-two');self.assertEqual(self.publish(project='site-two',slug='another-site').status_code,200)
    def test_reserved_and_previous_addresses_cannot_be_claimed(self):
        self.prepare()
        for slug in ['www','api','mail','admin','foo.bar','../x','xn--abc']:
            self.assertEqual(self.publish(slug=slug).status_code,400,slug)
        self.publish();Project.objects.all().delete();self.assertFalse(PublishedRelease.objects.exists());self.assertTrue(PublishedAddress.objects.exists())
        self.source();self.assertEqual(self.publish().status_code,409)
    def test_private_records_and_unpublished_paths_are_not_served(self):
        self.prepare();self.publish()
        for path in ['notes.md','package.json','.env','../index.html','api/accounts/session','missing.html']:
            self.assertEqual(self.asset(path=path).status_code,404,path)
        self.assertEqual(self.asset(token='wrong').status_code,404)
        self.assertEqual(self.asset(host='evil.example').status_code,404)
        self.assertEqual(self.asset(host='www.draftmango.com').status_code,404)
        payload=PublishedRelease.objects.get().files;self.assertNotIn('Private chat',str(payload));self.assertNotIn('Private notes',str(payload))
    def test_another_sites_release_cannot_be_used_for_rollback(self):
        self.prepare();self.publish();site=PublishedSite.objects.get()
        r=self.send(self.client,'/api/publishing/sites',{'action':'rollback','projectId':'site-one','releaseId':'11111111-1111-1111-1111-111111111111','expectedRevision':site.revision,'confirmed':True})
        self.assertEqual(r.status_code,404);self.assertContains(self.asset(),'First')
    def test_disabled_publishing_still_allows_unpublish(self):
        self.prepare();self.publish()
        with self.settings(PUBLISHING_ENABLED=False):
            self.assertEqual(self.publish(revision=1).status_code,503)
            self.assertEqual(self.send(self.client,'/api/publishing/sites',{'action':'unpublish','projectId':'site-one','expectedRevision':1,'confirmed':True}).status_code,200)
    def test_deleting_account_removes_public_files_but_keeps_address_reserved(self):
        self.prepare();self.publish();User.objects.all().delete()
        self.assertFalse(PublishedSite.objects.exists());self.assertFalse(PublishedRelease.objects.exists());self.assertTrue(PublishedAddress.objects.exists());self.assertEqual(self.asset().status_code,404)
    def test_invalid_source_cannot_replace_previous_release(self):
        self.prepare();self.publish();p=Project.objects.get();p.document['files']['../private.txt']='bad';p.save()
        self.assertEqual(self.publish(revision=1).status_code,400);self.assertContains(self.asset(),'First')
    def test_production_ignores_test_subscriptions(self):
        self.prepare();self.publish();self.source(project='site-two')
        BillingAccount.objects.create(owner=User.objects.get(),mode='test',status='active',plan='pro',period_end=timezone.now()+timedelta(days=30))
        with self.settings(PRODUCTION=True):self.assertEqual(self.publish(project='site-two',slug='second-site').status_code,403)
    def test_only_twenty_immutable_releases_are_retained(self):
        self.prepare()
        for i in range(23):
            if i:self.source(version=i,text=str(i))
            r=self.publish(version=i+1,revision=i);self.assertEqual(r.status_code,200,r.content)
        self.assertEqual(PublishedRelease.objects.count(),20);self.assertContains(self.asset(),'22')
