var fs = require('fs')
  , path = require('path')
  , request = require('request')
  , url = require('url')
  , parse = require('parse-link-header')

var bitbucketConfigFile = path.resolve(__dirname, '../../configs/bitbucket/', 'bitbucket-config.json')
  , bitbucketConfig = {}
  , isConfigEnabled = false

// ^^^helps with the home page view; should we show the bitbucket dropdown?

if (fs.existsSync(bitbucketConfigFile)) {
  bitbucketConfig = require(bitbucketConfigFile);
  isConfigEnabled = true;
} else if (process.env.bitbucket_client_id !== undefined) {
  bitbucketConfig = {
    "client_id": process.env.bitbucket_client_id,
    "redirect_uri": process.env.bitbucket_redirect_uri,
    "client_secret": process.env.bitbucket_client_secret,
    "callback_url": process.env.bitbucket_callback_url
  };
  isConfigEnabled = true;
  console.log('Bitbucket config found in environment. Plugin enabled. (Key: "' + bitbucketConfig.client_id +'")');
} else if (process.env.bitbucket_access_token !== undefined) {
  bitbucketConfig = {
    "access_token": process.env.bitbucket_access_token
  };
  isConfigEnabled = true;
  console.log('Bitbucket config found in environment. Plugin enabled using a personal access_token.');
} else {
  bitbucketConfig = {
    "client_id": "YOUR_ID"
  , "redirect_uri": "http://dillinger.io/"
  , "client_secret": "YOUR_SECRET"
  , "callback_url": "http://dillinger.io/oauth/bitbucket"
  }
  console.warn('Bitbucket config not found at ' + bitbucketConfigFile + '. Plugin disabled.')
}

function arrayToRegExp(arr) {
  return new RegExp("(" + arr.map(function(e) { return e.replace('.','\\.'); }).join('|') + ")$", 'i');
}

exports.Bitbucket = (function() {

  var bitbucketApi = 'https://api.bitbucket.org/2.0/'
    , headers = {
      "User-Agent": "X-Dillinger-App"
    }

  // String builder for auth url...
  function _buildAuthUrl() {
    return  'https://bitbucket.org/site/oauth2/authorize?client_id='
            + bitbucketConfig.client_id
            + '&response_type=code'
  }

  return {
    isConfigured: isConfigEnabled,
    bitbucketConfig: bitbucketConfig,
    generateAuthUrl: function(req, res) {
      return _buildAuthUrl()
    },
    getUsername: function(req, res, cb) {

      var uri = bitbucketApi + 'user?access_token=' + req.session.bitbucket.oauth

      var options = {
        headers: headers
      , uri: uri
      }

      console.log('getting username from bitbucket')

      request(options, function(e, r, d) {
        if (e) {
          console.error(e)
          return res.redirect(r.statusCode)
        }
        else if (!e && r.statusCode === 200) {
          d = JSON.parse(d)
          req.session.bitbucket.username = d.login
          cb && cb()
        }
      }) // end request.get()

    }, // end getUsername
    fetchOrgs: function(req, res) {
      var uri = bitbucketApi + 'teams/'

      var options = {
        headers: headers
      , uri: uri
      }

      request(options, function(e, r, d) {
        if (e) {
          res.send({
            error: 'Request error.',
            data: r.statusCode
          })
        }
        else if (!e && r.statusCode == 200) {
          var set = []

          d = JSON.parse(d)

          d.forEach(function(el) {

            // Right now BitBucket does not display a "Company Name" in user/orgs API route
            // Hopefully they will add it in later, for now use "login" name.

            var item = {
              url: el.url
            , name: el.login
            }

            set.push(item)
          })

          res.json(set)

        } // end else if
        else {
          res.json({ error: 'Unable to fetch organizations from Bitbucket.' })
        }
      }) // end request callback

    }, // end fetchOrgs

    fetchRepos: function(req, res) {

      var uri = bitbucketApi + '/repositories/'+ req.session.bitbucket.username +'?access_token=' + req.session.bitbucket.oauth

      if (isFinite(req.body.page) && +req.body.page > 1) {
        uri += "&page=" + req.body.page
      }

      if (isFinite(req.body.per_page) && +req.body.per_page > 1) {
        uri += "&per_page=" + req.body.per_page
      }

      uri += "&type=owner"

      var options = {
        headers: headers
      , uri: uri
      }

      request(options, function(e, r, d) {
        if (e) {
          res.send({
            error: 'Request error.',
            data: r.statusCode
          })
        }
        else if (!e && r.statusCode == 200) {
          var set = []

          d = JSON.parse(d)

          d.forEach(function(el) {

            var item = {
              url: el.url
            , name: el.name
            , private: el.private
            // future property we will need to pass so we can know whether we can "write" to repo
            //, permissions: el.permissions
            }

            set.push(item)
          })

          res.json({
            items: set,
            pagination: parse(r.headers['link'])
          });

        } // end else if
        else {
          res.json({ error: 'Unable to fetch repos from Bitbucket.' })
        }
      }) // end request callback
    }, // end fetchRepos
    fetchBranches: function(req, res) {
      var uri = bitbucketApi
        + 'repositories/'
        + req.session.bitbucket.username
        + '/'
        + req.body.repo_uuid
        +'/refs/branches?access_token=' + req.session.bitbucket.oauth

      var options = {
        headers: headers
      , uri: uri
      }

      request(options, function(e, r, d) {
        if (e) {
          res.send({
            error: 'Request error.'
          , d: r.statusCode
          })
        }
        else if (!e && r.statusCode === 200) {
          res.send(d)
        } // end else if
        else {
          res.json({ error: 'Unable to fetch branches from Bitbucket.' })
        }
      }) // end request callback

    }, // end fetchBranches


/** ENDED HERE **/


    fetchTreeFiles: function(req, res) {
      // /repos/:user/:repo/git/trees/:sha

      var uri, options, fileExts, regExp

      uri = bitbucketApi
        + 'repos/'
        + req.body.owner
        + '/'
        + req.body.repo
        + '/git/trees/'
        + req.body.sha + '?recursive=1&access_token=' + req.session.bitbucket.oauth
        ;

      options = {
        headers: headers
      , uri: uri
      };

      fileExts = req.body.fileExts.split("|");
      regExp = arrayToRegExp(fileExts);

      request(options, function(e, r, d) {

        if (e) {
          res.send({
            error: 'Request error.'
          , data: r.statusCode
          })
        }
        else if (!e && r.statusCode === 200) {
          d = JSON.parse(d)
          d.branch = req.body.branch // inject branch info

          // overwrite d.tree to only return items that match regexp
          d.tree = d.tree.filter(function(item) { return regExp.test(item.path) });

          res.json(d)
        } // end else if
        else {
          res.json({ error: 'Unable to fetch files from Bitbucket.' })
        }
      }) // end request callback

    }, // end fetchTreeFiles
    fetchFile: function(req, res) {

      var uri = req.body.url
        , isPrivateRepo = /blob/.test(uri)

      // https://api.bitbucket.com/octocat/Hello-World/git/blobs/44b4fc6d56897b048c772eb4087f854f46256132
      // If it is a private repo, we need to make an API call, because otherwise it is the raw file.
      if (isPrivateRepo) {
        uri += '?access_token=' + req.session.bitbucket.oauth
      }

      var options = {
        headers: headers
      , uri: uri
      }

      request(options, function(e, r, d) {
        if (e) {
          console.error(e)

          res.send({
            error: 'Request error.'
          , data: r.statusCode
          })
        }
        else if (!e && r.statusCode === 200) {
          var jsonResp = {
            data: JSON.parse(d),
            error: false
          }

          if (isPrivateRepo) {
            d = JSON.parse(d)
            jsonResp.data.content = (new Buffer(d.content, 'base64').toString('utf-8'))
          }

          res.json(jsonResp)

        } // end else if
        else {
          res.json({ error: 'Unable to fetch file from Bitbucket.' })
        }
      }) // end request callback

    }, // end fetchFile

    saveToBitbucket: function(req, res) {

      var data = req.body
      if (!data.uri) {
        res.json(400, { "error": "Requires Bitbucket URI" })
      }
      else {
        // uri = "https://api.bitbucket.com/repos/:owner/:repo/contents/:path"
        var
          commit, options, uri, owner,
          repo,   branch,  sha, message,
          isPrivateRepo;

        isPrivateRepo = /blob/.test(data.uri);

        branch  = data.branch;
        path    = data.path;
        sha     = data.sha;
        repo    = data.repo;
        owner   = data.owner;
        message = data.message;

        uri = bitbucketApi + "repos/" + owner + '/' + repo + '/contents/' + path;
        uri += '?access_token=' + req.session.bitbucket.oauth;

        commit = {
          message: message // Better commit messages?
        , path: path
        , branch: branch
        , content: new Buffer(data.data).toString('base64')
        , sha: sha
      };

        options = {
          headers: headers
        , uri: uri
        , method: "PUT"
        , body: JSON.stringify(commit)
        }

        request(options, function(e, r, d) {
          // 200 = Updated
          // 201 = Created
          if (!e && r.statusCode === 200 || r.statusCode === 201) {
            return res.json(200, JSON.parse(d))
          }
          return res.json(400, { "error": "Unable to save file: " + (e || JSON.parse(d).message) })

        })

      }
    }
  }

})()
