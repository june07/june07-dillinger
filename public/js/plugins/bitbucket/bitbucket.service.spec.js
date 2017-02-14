
'use strict';

describe("bitbucketService", function() {

  var
      service      = null,
      $httpBackend = null,
      diNotify     = null;

  beforeEach(window.angular.mock.module('Dillinger'));

  beforeEach( inject(function(_bitbucketService_, _$httpBackend_, _diNotify_) {
    service = _bitbucketService_;
    $httpBackend = _$httpBackend_;
    diNotify = _diNotify_;
  }));

  afterEach(function() {
    $httpBackend.verifyNoOutstandingExpectation();
    $httpBackend.verifyNoOutstandingRequest();
  });

  it('should fetch a file from bitbucket and set it on the service.fetched.file variable', function() {

    var markDownFile = {
      url:  'www.dilingertest.com/url',
      path:   'dilinger/test.md'
    };

    $httpBackend.expectPOST('import/bitbucket/file').
      respond({
          data: {
            content: 'dilinger test content',
            url: markDownFile.url,
            sha: 'dsdfagdsaggas3432sdt34ggagg'
          }
        });

    service.fetchFile(markDownFile.url, markDownFile.path).success(function(data) {

      expect(service.config.current.url).toEqual(markDownFile.url);
    });

    $httpBackend.flush();
  });


  it('should save the current file to bitbucket and return success message', function() {

    var markDownDocument = {
      uri:  'https://bitbucket.com/testbranch/TestDocument.md',
      data:   '#Dillinger Test',
      path:    'test/path',
      sha:     'dsdfagdsaggas3432sdt34ggagg',
      branch:  'testbranch',
      repo:    'testrepo',
      message: 'testmessage',
      owner:   'dilinger'
    };

    $httpBackend.expectPOST('save/bitbucket').respond({ content: { path: markDownDocument.path }});

    service.saveToBitbucket(markDownDocument);

    $httpBackend.flush();

    var diNotifyElements = document.getElementsByClassName('diNotify-message');
    var diNotifyElementsText = '';
    for (var i= 0; i < diNotifyElements.length; ++i) {
      diNotifyElementsText = diNotifyElementsText + diNotifyElements[i].innerHTML;
    }
    expect(diNotifyElementsText).toContain('Successfully saved to ' + markDownDocument.path);
  });


});