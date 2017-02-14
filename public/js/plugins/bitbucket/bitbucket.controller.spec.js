
'use strict';

describe("bitbucketController", function() {

  var
    $controller = null,
    $scope = null,
    $rootScope = null,
    $modal = null,
    bitbucketService = null,
    documentsService = null,
    $httpBackend = null,
    diNotify = null,
    q = null,
    deferred = null;

  var fakeData = {
    data : {
      content: {
        sha: "2teste1c67a2d28fced849ee1bb76e7391b93eb12"
      }
    }
  };

  var fakeModal = {
    result: {
      then: function() {
        $scope.$emit('document.refresh');
        return $scope.$emit('autosave');
      }
    }
  };

  beforeEach(window.angular.mock.module('Dillinger'));

  beforeEach(function() {
    documentsService = {
      getCurrentDocument: function() {
        var item = {
          id: '123',
          title: 'Bitbucket Controller Test Title',
          body: 'Bitbucket Controller Test Body',
          isBitbucketFile: true,
          bitbucket: {
            path: '/dillinger/testpath.md'
          }
        };
        return item;
      },
      setCurrentDocumentSHA: function() {
        var sha = "2fd4e1c67a2d28fced849ee1bb76e7391b93eb12";
        return sha;
      },
      createItem: function(data) {
      },
      addItem: function(file) {
      },
      setCurrentDocument: function(file) {
      }
    }
  });

  beforeEach(function() {
    bitbucketService = {
      saveToBitbucket: function(data) {
        deferred = q.defer();
        deferred.resolve(fakeData);
        return deferred.promise;
      },
      config: {
        user: {
          name: {}
        },
        orgs: "dillinger-orgs"
      },
      registerUserAsOrg: {
      },
      fetchOrgs: function() {
        deferred = q.defer();
        deferred.resolve('org registered');
        return deferred.promise;
      }
    }
  });

  beforeEach(inject(function($modal) {
    spyOn($modal, 'open').and.returnValue(fakeModal);
  }));

  beforeEach(inject(function($controller, $rootScope,  $modal, _bitbucketService_, _documentsService_, _diNotify_, $q) {
    $scope = $rootScope;
    q = $q;

    // Create the controller
    $controller('Bitbucket as vm', {
      $scope: $scope,
      $modal: $modal,
      bitbucketService: bitbucketService,
      documentsService: documentsService,
      diNotify: diNotify
    });
  }));

  it('should import the file, refresh and autosave the document', function() {
    spyOn($scope, '$emit');
    $scope.vm.importFile("dillinger-import");
    $scope.$digest();

    expect($scope.$emit).toHaveBeenCalledWith('autosave');
    expect($scope.$emit).toHaveBeenCalledWith('document.refresh');
  });

  it('should save, refresh and autosave the document', function() {
    spyOn($scope, '$emit');
    $scope.vm.saveTo("dillinger-save");
    $scope.$digest();

    // TODO: Needs to be updated to account for prepareBitbucketCommit()
    // being calle before the save method. 
    // expect($scope.$emit).toHaveBeenCalledWith('autosave');
    // expect($scope.$emit).toHaveBeenCalledWith('document.refresh');
  });

});