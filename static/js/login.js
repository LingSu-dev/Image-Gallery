(function () {
  "use strict";

  window.addEventListener("load", function () {
    function onError(err) {
      alert(err);
    }

    function submit() {
      if (document.querySelector("#login-form").checkValidity()) {
        var username = document.querySelector(
          "#login-form [name=username]"
        ).value;
        var password = document.querySelector(
          "#login-form [name=password]"
        ).value;
        var action = document.querySelector("#login-form [name=action]").value;
        apiService[action](username, password, function (err, username) {
          if (err) return onError(err);
          else {
            window.location.href = "/";
          }
        });
      }
    }

    document.querySelector("#signin").addEventListener("click", function (e) {
      document.querySelector("form [name=action]").value = "signin";
      submit();
    });

    document.querySelector("#signup").addEventListener("click", function (e) {
      document.querySelector("form [name=action]").value = "signup";
      submit();
    });

    document.querySelector("form").addEventListener("submit", function (e) {
      e.preventDefault();
    });
  });
})();
