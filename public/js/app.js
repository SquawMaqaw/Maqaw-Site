$(function() {

  var renderCode = function();

  // Register a user and render the code
  $('#register-submit').bind('click', function(e) {
    e.preventDefault();

    var paramsObj = {
      company: $('#register-company').val(),
      email: $('#register-email').val(),
      password: $('#register-password').val(),
      password_confirmation: $('#register-password-confirmation').val()
    };

    if (paramsObj.password != paramsObj.password_confirmation) {
      return $('#error').html("The passwords did not match");
    }

    var querystring = decodeURIComponent($.param(paramsObj));

    console.log(querystring);

    $.ajax({
      url: 'http://localhost:3000/register',
      method: 'POST',
      data: querystring,
      success: function(data) {
        $('#content').html("Success");
      },
      error: function(xhr, err) {
        console.log(xhr.readyState);
        console.log(xhr.status);
        console.log(xhr.responseText);
        $('#error').html("Error");
      }
    });
  });

  // Login a user and render the code
  $('#login-submit').bind('click', function() {
    var paramsObj = {
      email: $('#login-email'),
      password: $('#login-password')
    };

    console.log(paramsObj);

    $.ajax({
      url: 'http://localhost:3000/login',
      method: 'POST',
      data: encodeURIComponent(paramsObj),
      success: function(data) {
        $('#content').html('Success');
      },
      error: function(data) {
        $('#content').html('Error');
      }
    });

  });
});