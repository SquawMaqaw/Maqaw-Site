$(function() {

  var renderCodeLayout = function() {
    return '<h3>Add the Maqaw widget to your site</h3><h4>Paste the following code at the end of the &lt;body&gt;&lt;/body&gt; tags on each page you want the Maqaw widget to appear.</h4><pre id="code-snippet"></pre>';
  }

  var renderCodeSnippet = function(id, name) {
    return '!-- Begin Maqaw Code --! <script type="text/javascript">var maqawOptions = { key: "' + id + '", name: "' + name + '" };</script><script type="text/javascript" src="http://www.maqaw.com/cdn/maqaw.min.js"></script>!-- End Maqaw Code --!';
  };

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

    $.ajax({
      url: 'http://54.214.232.157:3000/register',
      method: 'POST',
      data: querystring,
      success: function(data) {
        $('#content').html(renderCodeLayout());
        $('#code-snippet').text(renderCodeSnippet(data.key, data.name));
      },
      error: function(xhr, err) {
        $('#error').html("Error registering your account");
      }
    });
  });

  // Login a user and render the code
  $('#login-submit').bind('click', function(e) {
    e.preventDefault();

    var paramsObj = {
      email: $('#login-email').val(),
      password: $('#login-password').val()
    };

    var querystring = decodeURIComponent($.param(paramsObj));

    $.ajax({
      url: 'http://54.214.232.157:3000/login',
      method: 'POST',
      data: querystring,
      success: function(data) {
        $('#content').html(renderCodeLayout());
        $('#code-snippet').text(renderCodeSnippet(data.key, data.name));
      },
      error: function(data) {
        $('#error').html('Error logging into your account');
      }
    });

  });
});