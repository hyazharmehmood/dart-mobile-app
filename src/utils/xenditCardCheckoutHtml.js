const XENDIT_COMPONENTS_SDK_URL =
  "https://unpkg.com/xendit-components-web@0.0.24/sdk/dist/index.umd.js";

export function buildXenditCardCheckoutHtml(componentsSdkKey) {
  const escapedKey = JSON.stringify(componentsSdkKey || "");
  const escapedSdkUrl = JSON.stringify(XENDIT_COMPONENTS_SDK_URL);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background: #ffffff;
      color: #1f2933;
      padding: 16px;
    }
    #card-root { min-height: 220px; }
    #action-root { min-height: 72px; margin-top: 12px; }
    #pay-btn {
      width: 100%;
      margin-top: 20px;
      padding: 16px;
      border: none;
      border-radius: 16px;
      background: #ff6400;
      color: #ffffff;
      font-size: 16px;
      font-weight: 700;
    }
    #pay-btn:disabled { opacity: 0.45; }
    #status {
      margin-top: 12px;
      font-size: 13px;
      line-height: 1.5;
      color: #6b7280;
      text-align: center;
    }
    .loading {
      text-align: center;
      padding: 48px 0;
      color: #6b7280;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div id="card-root"><div class="loading">Loading secure card form…</div></div>
  <div id="action-root"></div>
  <button id="pay-btn" type="button" disabled>Pay securely</button>
  <div id="status"></div>
  <script>
    (function () {
      function post(type, payload) {
        if (!window.ReactNativeWebView || !window.ReactNativeWebView.postMessage) {
          return;
        }

        window.ReactNativeWebView.postMessage(
          JSON.stringify(Object.assign({ type: type }, payload || {}))
        );
      }

      window.onerror = function (_message, _source, _lineno, _colno, error) {
        post("fatal-error", {
          message: (error && error.message) || "Card form crashed while loading."
        });
      };

      var componentsSdkKey = ${escapedKey};
      var payBtn = document.getElementById("pay-btn");
      var statusEl = document.getElementById("status");
      var cardRoot = document.getElementById("card-root");
      var actionRoot = document.getElementById("action-root");
      var components = null;

      function setStatus(text) {
        statusEl.textContent = text || "";
      }

      if (!componentsSdkKey) {
        post("fatal-error", { message: "Card session key is missing." });
        return;
      }

      function getComponentsConstructor() {
        if (window.Xendit && window.Xendit.XenditComponents) {
          return window.Xendit.XenditComponents;
        }

        if (window.XenditComponents) {
          return window.XenditComponents;
        }

        return null;
      }

      function mountCardForm() {
        var ComponentsCtor = getComponentsConstructor();

        if (!ComponentsCtor) {
          post("fatal-error", { message: "Xendit card SDK failed to load." });
          return;
        }

        try {
          components = new ComponentsCtor({
            componentsSdkKey: componentsSdkKey,
            iframeFieldAppearance: {
              inputStyles: {
                color: "#1f2933",
                fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif",
                fontSize: "16px"
              },
              placeholderStyles: { color: "#9ca3af" }
            }
          });
        } catch (error) {
          post("fatal-error", {
            message: error && error.message ? error.message : "Failed to initialize card form."
          });
          return;
        }

        components.addEventListener("init", function () {
          cardRoot.innerHTML = "";
          var cards = (components.getActiveChannels({ filter: "CARDS" }) || [])[0];

          if (!cards) {
            post("fatal-error", { message: "Card payments are not available for this session." });
            return;
          }

          var cardsComponent = components.createChannelComponent(cards);
          cardRoot.appendChild(cardsComponent);
          post("ready");
        });

        components.addEventListener("action-begin", function () {
          actionRoot.innerHTML = "";
          var actionEl = components.createActionContainerComponent();
          actionRoot.appendChild(actionEl);
          post("action-begin");
        });

        components.addEventListener("action-end", function () {
          actionRoot.innerHTML = "";
          post("action-end");
        });

        components.addEventListener("submission-ready", function () {
          payBtn.disabled = false;
          setStatus("Enter your card details to continue.");
        });

        components.addEventListener("submission-not-ready", function () {
          payBtn.disabled = true;
        });

        components.addEventListener("submission-begin", function () {
          payBtn.disabled = true;
          setStatus("Processing payment…");
          post("submission-begin");
        });

        components.addEventListener("submission-end", function (event) {
          payBtn.disabled = false;
          var errors = event && event.userErrorMessage ? event.userErrorMessage : null;
          post("submission-end", { userErrorMessage: errors });

          if (errors && errors.length) {
            setStatus(errors.join(" "));
          }
        });

        components.addEventListener("session-complete", function () {
          post("session-complete");
        });

        components.addEventListener("fatal-error", function (event) {
          post("fatal-error", {
            message: event && event.message ? event.message : "Card payment failed."
          });
        });

        components.addEventListener("session-expired-or-canceled", function () {
          post("session-expired");
        });

        payBtn.addEventListener("click", function () {
          try {
            components.submit();
          } catch (error) {
            post("submission-end", {
              userErrorMessage: [
                error && error.message ? error.message : "Unable to submit payment."
              ]
            });
          }
        });
      }

      function loadSdk() {
        if (getComponentsConstructor()) {
          mountCardForm();
          return;
        }

        var script = document.createElement("script");
        script.src = ${escapedSdkUrl};
        script.async = true;
        script.onload = function () {
          if (!getComponentsConstructor()) {
            post("fatal-error", { message: "Xendit card SDK loaded but is unavailable." });
            return;
          }
          mountCardForm();
        };
        script.onerror = function () {
          post("fatal-error", { message: "Could not download the Xendit card SDK." });
        };
        document.head.appendChild(script);

        window.setTimeout(function () {
          if (!getComponentsConstructor()) {
            post("fatal-error", { message: "Timed out while loading the Xendit card SDK." });
          }
        }, 15000);
      }

      loadSdk();
    })();
  </script>
</body>
</html>`;
}
