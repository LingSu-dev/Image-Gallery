(function () {
  "use strict";

  let currentImage = null;
  let currentPage = 0;
  let currentUser = null;

  function onError(err) {
    console.log(err);
  }

  let updateComments = function () {
    apiService.getComments(
      currentImage._id,
      currentPage,
      function (err, comments) {
        if (err) return onError(err);
        document.querySelector("#message-container").innerHTML = "";
        comments.messages.reverse().forEach(function (element) {
          let date = new Date(element.createdAt).toLocaleDateString("en-us", {
            year: "numeric",
            month: "short",
            day: "numeric",
          });
          let elmt = document.createElement("div");
          elmt.className = "message";
          elmt.innerHTML = `
					<div class="message-user">
						<div class="message-user-info">
							<div class="message-username">${element.author}</div>
							<div class="message-date">${date}</div>
						</div>
						<div class="delete-icon icon"></div>
					</div>
					<div class="message-content">${element.content}</div>
        `;

          // buttons
          elmt
            .querySelector(".delete-icon")
            .addEventListener("click", function (e) {
              apiService.deleteComment(element._id, function (err, comment) {
                apiService.getComments(
                  currentImage._id,
                  currentPage,
                  function (err, comments) {
                    if (!comments.size && currentPage) {
                      currentPage -= 1;
                    }
                    updateComments();
                  }
                );
              });
            });
          document.getElementById("message-container").prepend(elmt);
        });
      }
    );
  };

  let update = function () {
    if (currentImage) {
      // src="/api/users/${message.username}/profile/picture/" alt="${message.username}"
      document.querySelector("#user").innerHTML = currentUser;
      document.querySelector(
        ".img"
      ).src = `/api/images/${currentImage._id}/image/`;
      document.querySelector(".img").alt = "Loading";
      document.querySelector("#img-title").innerHTML = currentImage.title;
      document.querySelector(".delete").classList.remove("hidden");
      updateComments();
    } else {
      document.querySelector("#user").innerHTML = currentUser;
      document.querySelector(".img").src = "./media/Empty.png";
      document.querySelector("#img-title").innerHTML = "";
      document.querySelector("#img-author").innerHTML = "";
      document.querySelector(".delete").classList.add("hidden");
      document.querySelector("#message-container").innerHTML = "";
    }
  };

  window.addEventListener("load", function () {
    currentUser = apiService.getLocalUsername();
    if (currentUser === "") {
      document.querySelector("#content").innerHTML = "";
      document.querySelector("#signout").classList.add("hidden");
      document.querySelector("#submit-image").classList.add("hidden");
    } else {
      document.querySelector("#signup").innerHTML = "Welcome: " + currentUser;
      document.querySelector("#signup").classList.remove("submit-btn");
      document.querySelector(".nav-overlay").classList.remove("hidden");
      apiService.getFirstImage(currentUser, function (err, img) {
        if (err) return onError(err);
        currentImage = img.image[0];
        update();

        //overlay
        let overlay = document.querySelector(".overlay");
        document
          .querySelector("#submit-image")
          .addEventListener("click", function (e) {
            overlay.classList.remove("hidden");
          });
        document
          .querySelector(".cancel")
          .addEventListener("click", function (e) {
            overlay.classList.add("hidden");
          });

        // new image form
        document
          .querySelector("#create-image-form")
          .addEventListener("submit", function (e) {
            // prevent from refreshing the page on submit
            e.preventDefault();

            // read form elements
            let title = document.getElementById("post-title").value;
            let fileField = document.querySelector("input[type='file']");
            apiService.addImage(title, fileField.files[0], function (err, img) {
              if (err) return onError(err);
              // clean form
              document.querySelector("#create-image-form").reset();
              document.querySelector(".overlay").classList.add("hidden");
              currentImage = img;
              update();
            });
          });

        // comments form
        document
          .querySelector("#create-comment-form")
          .addEventListener("submit", function (e) {
            // prevent from refreshing the page on submit
            e.preventDefault();

            // read form elements
            let content = document.getElementById("comment-content").value;

            // let img = apiService.getImageByIndex(imgIndex);
            apiService.addComment(
              currentImage._id,
              content,
              function (err, comment) {
                // clean form
                document.querySelector("#create-comment-form").reset();
                updateComments();
              }
            );
          });

        // gallery delete button
        document
          .querySelector("#delete-img")
          .addEventListener("click", function (e) {
            // let img = apiService.getImageByIndex(imgIndex);
            apiService.deleteImage(currentImage._id, function (err, img) {
              apiService.getFirstImage(currentUser, function (err, newimg) {
                currentImage = newimg.image[0];
                update();
              });
            });
          });

        // comment nav buttons
        document
          .querySelector("#comment-nav-left")
          .addEventListener("click", function (e) {
            if (currentImage) {
              if (currentPage > 0) {
                currentPage -= 1;
              }
              update();
            }
          });

        document
          .querySelector("#comment-nav-right")
          .addEventListener("click", function (e) {
            if (currentImage) {
              apiService.getComments(
                currentImage._id,
                currentPage + 1,
                function (err, comments) {
                  if (comments.size) {
                    currentPage += 1;
                  }
                  update();
                }
              );
            }
          });

        // img nav buttons
        document
          .querySelector("#img-nav-left")
          .addEventListener("click", function (e) {
            if (currentImage) {
              apiService.getPreviousImage(
                currentImage._id,
                currentImage.author,
                function (err, newimg) {
                  if (newimg.size) {
                    currentImage = newimg.image[0];
                    currentPage = 0;
                    update();
                  }
                }
              );
            }
          });

        document
          .querySelector("#img-nav-right")
          .addEventListener("click", function (e) {
            if (currentImage) {
              apiService.getNextImage(
                currentImage._id,
                currentImage.author,
                function (err, newimg) {
                  if (newimg.size) {
                    currentImage = newimg.image[0];
                    currentPage = 0;
                    update();
                  }
                }
              );
            }
          });

        document
          .querySelector("#user-nav-arrows-left")
          .addEventListener("click", function (e) {
            if (currentUser) {
              apiService.getNextUser(currentUser, function (err, newUser) {
                if (newUser.size) {
                  currentUser = newUser.user[0]._id;
                  currentPage = 0;
                  apiService.getFirstImage(currentUser, function (err, newimg) {
                    currentImage = newimg.image[0];
                    update();
                  });
                }
              });
            }
          });

        document
          .querySelector("#user-nav-arrows-right")
          .addEventListener("click", function (e) {
            if (currentUser) {
              apiService.getPreviousUser(currentUser, function (err, newUser) {
                if (newUser.size) {
                  currentUser = newUser.user[0]._id;
                  currentPage = 0;
                  apiService.getFirstImage(currentUser, function (err, newimg) {
                    currentImage = newimg.image[0];
                    update();
                  });
                }
              });
            }
          });
      });
    }
  });
})();
