var express = require('express')
  , app = module.exports = express()
  , Bitbucket = require('./bitbucket.js').Bitbucket
  , request = require('request')
  , qs = require('querystring')
  , fs = require('fs')
  , path = require('path')

/* Bitbucket stuff */

var oauth_bitbucket_redirect = function(req, res) {

  // Create BitBucket session object and stash for later.
  var uri;
  req.session.bitbucket = {};
  req.session.bitbucket.oauth = {
    request_token: null,
    request_token_secret: null,
    access_token_secret: null,
    access_token: null
  }
  uri = Bitbucket.generateAuthUrl(req)
  res.redirect(uri)

}

var oauth_bitbucket = function(req, res, cb) {
  if (!req.query.code) {
    cb();
  } else {

    var code = req.query.code
      , client_id = Bitbucket.bitbucketConfig.client_id
      , redirect_uri = Bitbucket.bitbucketConfig.redirect_uri
      , client_secret = Bitbucket.bitbucketConfig.client_secret

/*curl -X POST -u "client_id:secret" \
  https://bitbucket.org/site/oauth2/access_token \
  -d grant_type=authorization_code -d code={code}*/

    var params = '?grant_type=authorization_code'
                  + '&code=' + code
                  + '&client_id=' + client_id
                  + '&client_secret=' + client_secret

    var uri = 'https://'+client_id + ':' + client_secret+'@bitbucket.org/site/oauth2/access_token'

    request.post({
      uri: uri,
      form: { grant_type: 'authorization_code', code: code }
    }, function(err, resp, body) {
      // TODO: MAKE THIS MORE GRACEFUL
      if (err) res.send(err.message)
      else {
        if (!req.session.bitbucket) {
          req.session.bitbucket = {
            oauth: null
          }
        }

        req.session.bitbucket.oauth = (JSON.parse(body)).access_token
        req.session.bitbucket.scopes = (JSON.parse(body)).scopes
        req.session.bitbucket.expires_in = (JSON.parse(body)).expires_in
        req.session.bitbucket.refresh_token = (JSON.parse(body)).refresh_token
        req.session.bitbucket.token_type = (JSON.parse(body)).token_type
        req.session.isBitbucketSynced = true
        console.log('about')
        Bitbucket.getUsername(req, res,function() {
          res.redirect('/')
        })

      }
    })

  } // end else
}

var oauth_bitbucket_refresh = function(req, res) {

    var client_id = Bitbucket.bitbucketConfig.client_id
      , client_secret = Bitbucket.bitbucketConfig.client_secret
      , refresh_token = Bitbucket.bitbucketConfig.refresh_token

    var uri = Bitbucket.generateRefreshUrl();

    request.post({
      uri: uri,
      form: { grant_type: 'refresh_token', refresh_token: refresh_token }
    }, function(err, resp, body) {
      // TODO: MAKE THIS MORE GRACEFUL
      if (err) res.send(err.message)
      else {
        if (!req.session.bitbucket) {
          req.session.bitbucket = {
            oauth: null
          }
        }

        req.session.bitbucket.oauth = (JSON.parse(body)).access_token
        req.session.bitbucket.scopes = (JSON.parse(body)).scopes
        req.session.bitbucket.expires_in = (JSON.parse(body)).expires_in
        req.session.bitbucket.refresh_token = (JSON.parse(body)).refresh_token
        req.session.bitbucket.token_type = (JSON.parse(body)).token_type
        console.log('about')
        Bitbucket.getUsername(req, res, function() {})
      }
    })
}

var unlink_bitbucket = function(req, res) {
  // Essentially remove the session for dropbox...
  delete req.session.bitbucket
  req.session.isBitbucketSynced = false
  res.redirect('/')
}

var import_bitbucket_orgs = function(req, res) {

  Bitbucket.fetchOrgs(req, res)

}

var import_bitbucket_repos = function(req, res) {

  Bitbucket.fetchRepos(req, res)

}

var import_bitbucket_branches = function(req, res) {

  Bitbucket.fetchBranches(req, res)

}

var import_tree_files = function(req, res) {

  Bitbucket.fetchTreeFiles(req, res)

}

var import_bitbucket_file = function(req, res) {

  Bitbucket.fetchFile(req, res)

}

var save_bitbucket = function(req, res) {

  Bitbucket.saveToBitbucket(req, res)

}

/* End Bitbucket stuff */

/* Begin Bitbucket */

app.get('/refresh/bitbucket', oauth_bitbucket_refresh);

app.get('/redirect/bitbucket', oauth_bitbucket_redirect);

app.get('/oauth/bitbucket', oauth_bitbucket);

app.get('/unlink/bitbucket', unlink_bitbucket);

// app.get('/account/bitbucket', account_info_bitbucket)

app.post('/import/bitbucket/orgs', import_bitbucket_orgs);

app.post('/import/bitbucket/repos', import_bitbucket_repos);

app.post('/import/bitbucket/branches', import_bitbucket_branches);

app.post('/import/bitbucket/tree_files', import_tree_files);

app.post('/import/bitbucket/file', import_bitbucket_file);

app.post('/save/bitbucket', save_bitbucket);

app.get('/js/bitbucket.js', function(req, res) {
  fs.readFile(path.join(__dirname, 'client.js'), 'utf8', function(err, data) {
    if (err) {
      res.send(500, "Sorry couldn't read file")
    }
    else {
      res.setHeader('content-type', 'text/javascript');
      res.send(200, data)
    }
  })
})

/* End Bitbucket */
