Java.perform(function() {

    /*
    hook list:
    1.SSLcontext
    2.okhttp
    3.webview
    4.XUtils
    5.httpclientandroidlib
    6.JSSE
    7.network\_security\_config (android 7.0+)
    8.Apache Http client (support partly)
    9.OpenSSLSocketImpl
    10.TrustKit
    11.Cronet
    */

    var X509TrustManager = Java.use('javax.net.ssl.X509TrustManager');
    var HostnameVerifier = Java.use('javax.net.ssl.HostnameVerifier');
    var SSLContext = Java.use('javax.net.ssl.SSLContext');
    var quiet_output = false;

    function quiet_send(data) {

        if (quiet_output) {

            return;
        }

        send(data)
    }

    var X509Certificate = Java.use("java.security.cert.X509Certificate");
    var TrustManager;
    try {
        TrustManager = Java.registerClass({
            name: 'org.wooyun.TrustManager',
            implements: [X509TrustManager],
            methods: {
                checkClientTrusted: function(chain, authType) {},
                checkServerTrusted: function(chain, authType) {},
                getAcceptedIssuers: function() {
                    return [];
                }
            }
        });
    } catch (e) {
        quiet_send("registerClass from X509TrustManager >>>>>>>> " + e.message);
    }

    var TrustManagers = [TrustManager.$new()];

    try {
        var TLS_SSLContext = SSLContext.getInstance("TLS");
        TLS_SSLContext.init(null, TrustManagers, null);
        var EmptySSLFactory = TLS_SSLContext.getSocketFactory();
    } catch (e) {
        quiet_send(e.message);
    }

    send('Custom, Empty TrustManager ready');
    var SSLContext_init = SSLContext.init.overload(
        '[Ljavax.net.ssl.KeyManager;', '[Ljavax.net.ssl.TrustManager;', 'java.security.SecureRandom');

    // Override the init method, specifying our new TrustManager
    SSLContext_init.implementation = function(keyManager, trustManager, secureRandom) {

        quiet_send('Overriding SSLContext.init() with the custom TrustManager');

        SSLContext_init.call(this, null, TrustManagers, null);
    };

    /*** okhttp3.x unpinning ***/
    try {

        var CertificatePinner = Java.use('okhttp3.CertificatePinner');
        quiet_send('OkHTTP 3.x Found');
        CertificatePinner.check.overload('java.lang.String', 'java.util.List').implementation = function() {
            quiet_send('OkHTTP 3.x check() called. Not throwing an exception.');
        }

        var OkHttpClient$Builder = Java.use('okhttp3.OkHttpClient$Builder');
        quiet_send('OkHttpClient$Builder Found');
        console.log("hostnameVerifier", OkHttpClient$Builder.hostnameVerifier);
        OkHttpClient$Builder.hostnameVerifier.implementation = function () {
            quiet_send('OkHttpClient$Builder hostnameVerifier() called. Not throwing an exception.');
            return this;
        }

        var myHostnameVerifier = Java.registerClass({
            name: 'com.xiaojianbang.MyHostnameVerifier',
            implements: [HostnameVerifier],
            methods: {
                verify: function (hostname, session) {
                    return true;
                }
            }
        });

        var OkHttpClient = Java.use('okhttp3.OkHttpClient');
        OkHttpClient.hostnameVerifier.implementation = function () {
            quiet_send('OkHttpClient hostnameVerifier() called. Not throwing an exception.');
            return myHostnameVerifier.$new();
        }

    } catch (err) {
        if (err.message.indexOf('ClassNotFoundException') === 0) {

            throw new Error(err);
        }
    }
    try {

        var PinningTrustManager = Java.use('appcelerator.https.PinningTrustManager');

        send('Appcelerator Titanium Found');

        PinningTrustManager.checkServerTrusted.implementation = function() {

            quiet_send('Appcelerator checkServerTrusted() called. Not throwing an exception.');
        }

    } catch (err) {
        if (err.message.indexOf('ClassNotFoundException') === 0) {

            throw new Error(err);
        }
    }

    /*** okhttp unpinning ***/

    try {
        var OkHttpClient = Java.use("com.squareup.okhttp.OkHttpClient");
        OkHttpClient.setCertificatePinner.implementation = function(certificatePinner) {
            // do nothing
            quiet_send("OkHttpClient.setCertificatePinner Called!");
            return this;
        };

        // Invalidate the certificate pinnet checks (if "setCertificatePinner" was called before the previous invalidation)
        var CertificatePinner = Java.use("com.squareup.okhttp.CertificatePinner");
        CertificatePinner.check.overload('java.lang.String', '[Ljava.security.cert.Certificate;').implementation = function(p0, p1) {
            // do nothing
            quiet_send("okhttp Called! [Certificate]");

        };
        CertificatePinner.check.overload('java.lang.String', 'java.util.List').implementation = function(p0, p1) {
            // do nothing
            quiet_send("okhttp Called! [List]");

        };
    } catch (e) {
        quiet_send("com.squareup.okhttp not found");
    }

    /*** WebView Hooks ***/
    var WebViewClient = Java.use("android.webkit.WebViewClient");

    WebViewClient.onReceivedSslError.implementation = function(webView, sslErrorHandler, sslError) {
        quiet_send("WebViewClient onReceivedSslError invoke");
        //执行proceed方法
        sslErrorHandler.proceed();

    };

    WebViewClient.onReceivedError.overload('android.webkit.WebView', 'int', 'java.lang.String', 'java.lang.String').implementation = function(a, b, c, d) {
        quiet_send("WebViewClient onReceivedError invoked");

    };

    WebViewClient.onReceivedError.overload('android.webkit.WebView', 'android.webkit.WebResourceRequest', 'android.webkit.WebResourceError').implementation = function() {
        quiet_send("WebViewClient onReceivedError invoked");

    };

    /*** JSSE Hooks ***/
    var HttpsURLConnection = Java.use("com.android.okhttp.internal.huc.HttpsURLConnectionImpl");
    HttpsURLConnection.setSSLSocketFactory.implementation = function(SSLSocketFactory) {
        quiet_send("HttpsURLConnection.setSSLSocketFactory invoked");
    };
    HttpsURLConnection.setHostnameVerifier.implementation = function(hostnameVerifier) {
        quiet_send("HttpsURLConnection.setHostnameVerifier invoked");
    };

    /*** Xutils3.x hooks ***/
        //Implement a new HostnameVerifier
    var TrustHostnameVerifier;
    try {
        TrustHostnameVerifier = Java.registerClass({
            name: 'org.wooyun.TrustHostnameVerifier',
            implements: [HostnameVerifier],
            method: {
                verify: function(hostname, session) {
                    return true;
                }
            }
        });

    } catch (e) {
        //java.lang.ClassNotFoundException: Didn't find class "org.wooyun.TrustHostnameVerifier"
        quiet_send("registerClass from hostnameVerifier >>>>>>>> " + e.message);
    }

    try {
        var RequestParams = Java.use('org.xutils.http.RequestParams');
        RequestParams.setSslSocketFactory.implementation = function(sslSocketFactory) {
            sslSocketFactory = EmptySSLFactory;
            return null;
        }

        RequestParams.setHostnameVerifier.implementation = function(hostnameVerifier) {
            hostnameVerifier = TrustHostnameVerifier.$new();
            return null;
        }

    } catch (e) {
        quiet_send("Xutils hooks not Found");
    }

    /*** httpclientandroidlib Hooks ***/
    try {
        var AbstractVerifier = Java.use("ch.boye.httpclientandroidlib.conn.ssl.AbstractVerifier");
        AbstractVerifier.verify.overload('java.lang.String', '[Ljava.lang.String', '[Ljava.lang.String', 'boolean').implementation = function() {
            quiet_send("httpclientandroidlib Hooks");
            return null;
        }
    } catch (e) {
        quiet_send("httpclientandroidlib Hooks not found");
    }

    var TrustManagerImpl = Java.use("com.android.org.conscrypt.TrustManagerImpl");
    try {
        // Android 7+ TrustManagerImpl
        TrustManagerImpl.verifyChain.implementation = function(untrustedChain, trustAnchorChain, host, clientAuth, ocspData, tlsSctData) {
            quiet_send("TrustManagerImpl verifyChain called");
            return untrustedChain;
        }
    } catch (e) {
        quiet_send("TrustManagerImpl verifyChain nout found below 7.0");
    }
    // OpenSSLSocketImpl
    try {
        var OpenSSLSocketImpl = Java.use('com.android.org.conscrypt.OpenSSLSocketImpl');
        OpenSSLSocketImpl.verifyCertificateChain.implementation = function(certRefs, authMethod) {
            quiet_send('OpenSSLSocketImpl.verifyCertificateChain');
        }

        quiet_send('OpenSSLSocketImpl pinning')
    } catch (err) {
        quiet_send('OpenSSLSocketImpl pinner not found');
    }
    // Trustkit
    try {
        var Activity = Java.use("com.datatheorem.android.trustkit.pinning.OkHostnameVerifier");
        Activity.verify.overload('java.lang.String', 'javax.net.ssl.SSLSession').implementation = function(str) {
            quiet_send('Trustkit.verify1: ' + str);
            return true;
        };
        Activity.verify.overload('java.lang.String', 'java.security.cert.X509Certificate').implementation = function(str) {
            quiet_send('Trustkit.verify2: ' + str);
            return true;
        };

        quiet_send('Trustkit pinning')
    } catch (err) {
        quiet_send('Trustkit pinner not found')
    }

    try {
        var netBuilder = Java.use("org.chromium.net.CronetEngine$Builder");
        netBuilder.enablePublicKeyPinningBypassForLocalTrustAnchors.implementation = function(arg) {

            console.log("Enables or disables public key pinning bypass for local trust anchors = " + arg);

            var ret = netBuilder.enablePublicKeyPinningBypassForLocalTrustAnchors.call(this, true);
            return ret;
        };

        netBuilder.addPublicKeyPins.implementation = function(hostName, pinsSha256, includeSubdomains, expirationDate) {
            console.log("cronet addPublicKeyPins hostName = " + hostName);
            return this;
        };

    } catch (err) {
        console.log('[-] Cronet pinner not found')
    }
});
