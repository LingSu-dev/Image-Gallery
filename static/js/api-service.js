let apiService = (function () {
  let module = {};

  function send(method, url, data, callback) {
    const config = {
      method: method,
    };
    if (!["GET", "DELETE"].includes(method)) {
      config.headers = {
        "Content-Type": "application/json",
      };
      config.body = JSON.stringify(data);
    }
    fetch(url, config)
      .then((res) => {
        if (res.ok) {
          return res.json();
        }
        return res.text().then((text) => {
          throw new Error(text);
        });
      })
      .then((val) => callback(null, val))
      .catch((err) => callback(err, null));
  }

  module.getLocalUsername = function () {
    return document.cookie.replace(
      /(?:(?:^|.*;\s*)username\s*\=\s*([^;]*).*$)|^.*$/,
      "$1"
    );
  };

  module.getCurrentUser = function (callback) {
    send("GET", "/api/users/", {}, callback);
  };

  module.getNextUser = function (username, callback) {
    send(
      "GET",
      "/api/users/" + username + "/" + "?action=forward",
      {},
      callback
    );
  };

  module.getPreviousUser = function (username, callback) {
    send(
      "GET",
      "/api/users/" + username + "/" + "?action=backward",
      {},
      callback
    );
  };

  module.getUserByUsername = function (username, callback) {
    send(
      "GET",
      "/api/users/" + username + "/" + "?action=current",
      {},
      callback
    );
  };

  module.signin = function (username, password, callback) {
    send("POST", "/signin/", { username, password }, callback);
  };

  module.signup = function (username, password, callback) {
    send("POST", "/signup/", { username, password }, callback);
  };

  module.getFirstImage = function (username, callback) {
    send("GET", "/api/images/users/" + username + "/", {}, callback);
  };

  module.getNextImage = function (imageId, username, callback) {
    send(
      "GET",
      "/api/images/" + imageId + "/users/" + username + "/" + "?action=forward",
      {},
      callback
    );
  };

  module.getPreviousImage = function (imageId, username, callback) {
    send(
      "GET",
      "/api/images/" +
        imageId +
        "/users/" +
        username +
        "/" +
        "?action=backward",
      {},
      callback
    );
  };

  module.getCurrentImage = function (imageId, username, callback) {
    send(
      "GET",
      "/api/images/" + imageId + "/users/" + username + "/" + "?action=current",
      {},
      callback
    );
  };

  // add an image to the gallery
  module.addImage = function (title, file, callback) {
    const formData = new FormData();
    formData.append("title", title);
    formData.append("image", file);
    fetch("/api/images/", {
      method: "POST",
      body: formData,
    })
      .then((res) => {
        if (res.ok) {
          return res.json();
        }
        return res.text().then((text) => {
          throw new Error(text);
        });
      })
      .then((val) => callback(null, val))
      .catch((err) => callback(err, null));
  };

  // delete an image from the gallery given its imageId
  module.deleteImage = function (imageId, callback) {
    send("DELETE", "/api/images/" + imageId + "/", {}, callback);
  };

  module.getComments = function (imageId, page, callback) {
    send(
      "GET",
      "/api/comments/images/" + imageId + "/" + "?page=" + page,
      {},
      callback
    );
  };

  // add a comment to an image
  module.addComment = function (imageId, content, callback) {
    send(
      "POST",
      "/api/comments/",
      { imageId: imageId, content: content },
      callback
    );
  };

  // delete a comment to an image
  module.deleteComment = function (commentId, callback) {
    send("DELETE", "/api/comments/" + commentId + "/", {}, callback);
  };

  return module;
})();
