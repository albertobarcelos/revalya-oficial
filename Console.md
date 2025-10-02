10:10:58.237 Running build in Washington, D.C., USA (East) – iad1
10:10:58.245 Build machine configuration: 2 cores, 8 GB
10:10:58.294 Cloning github.com/albertobarcelos/revalya-oficial (Branch: main, Commit: 63c1f9e)
10:10:58.582 Previous build caches not available
10:10:59.353 Cloning completed: 1.059s
10:10:59.855 Running "vercel build"
10:11:00.253 Vercel CLI 48.1.6
10:11:00.495 WARN! When using Next.js, it is recommended to place JavaScript Functions inside of the `pages/api` (provided by Next.js) directory instead of `api` (provided by Vercel). Other languages (Python, Go, etc) should still go in the `api` directory.
10:11:00.495 Learn More: https://nextjs.org/docs/api-routes/introduction
10:11:01.052 Warning: Detected "engines": { "node": ">=18.0.0" } in your `package.json` that will automatically upgrade when a new major Node.js Version is released. Learn More: http://vercel.link/node-version
10:11:01.072 Installing dependencies...
10:11:05.418 npm warn deprecated stringify-package@1.0.1: This module is not used anymore, and has been replaced by @npmcli/package-json
10:11:06.571 npm warn deprecated q@1.5.1: You or someone you depend on is using Q, the JavaScript Promise library that gave JavaScript developers strong feelings about promises. They can almost certainly migrate to the native JavaScript promise now. Thank you literally everyone for joining me in this bet against the odds. Be excellent to each other.
10:11:06.572 npm warn deprecated
10:11:06.572 npm warn deprecated (For a CapTP with native promises, see @endo/eventual-send and @endo/captp)
10:11:07.734 npm warn deprecated inflight@1.0.6: This module is not supported, and leaks memory. Do not use it. Check out lru-cache if you want a good and tested way to coalesce async requests by a key value, which is much more comprehensive and powerful.
10:11:07.883 npm warn deprecated node-domexception@1.0.0: Use your platform's native DOMException instead
10:11:08.630 npm warn deprecated domexception@4.0.0: Use your platform's native DOMException instead
10:11:09.713 npm warn deprecated abab@2.0.6: Use your platform's native atob() and btoa() methods instead
10:11:12.169 npm warn deprecated glob@7.2.3: Glob versions prior to v9 are no longer supported
10:11:12.754 npm warn deprecated glob@7.2.3: Glob versions prior to v9 are no longer supported
10:11:12.835 npm warn deprecated glob@7.2.3: Glob versions prior to v9 are no longer supported
10:11:13.098 npm warn deprecated glob@7.2.3: Glob versions prior to v9 are no longer supported
10:11:13.768 npm warn deprecated glob@7.2.3: Glob versions prior to v9 are no longer supported
10:11:37.571 
10:11:37.572 > revalya-financial-system@2.0.0 prepare
10:11:37.572 > husky install
10:11:37.572 
10:11:37.615 husky - Git hooks installed
10:11:37.638 
10:11:37.638 added 1599 packages in 36s
10:11:37.639 
10:11:37.639 283 packages are looking for funding
10:11:37.639   run `npm fund` for details
10:11:37.762 Running "npm run build"
10:11:37.872 
10:11:37.873 > revalya-financial-system@2.0.0 build
10:11:37.874 > vite build
10:11:37.874 
10:11:38.143 [36mvite v5.4.20 [32mbuilding for production...[36m[39m
10:11:38.199 transforming...
10:11:53.674 [32m✓[39m 4378 modules transformed.
10:11:55.121 Generated an empty chunk: "financial-vendor".
10:11:55.561 rendering chunks...
10:11:56.643 computing gzip size...
10:11:56.736 [2mdist/[22m[32mindex.html                                  [39m[1m[2m  1.24 kB[22m[1m[22m[2m │ gzip:   0.47 kB[22m
10:11:56.737 [2mdist/[22m[2massets/[22m[32mprimeicons-C6QP2o4f.woff2            [39m[1m[2m 35.15 kB[22m[1m[22m
10:11:56.737 [2mdist/[22m[2massets/[22m[32mprimeicons-MpK4pl85.ttf              [39m[1m[2m 84.98 kB[22m[1m[22m
10:11:56.737 [2mdist/[22m[2massets/[22m[32mprimeicons-WjwUDZjB.woff             [39m[1m[2m 85.06 kB[22m[1m[22m
10:11:56.738 [2mdist/[22m[2massets/[22m[32mprimeicons-DMOk5skT.eot              [39m[1m[2m 85.16 kB[22m[1m[22m
10:11:56.738 [2mdist/[22m[2massets/[22m[32mprimeicons-Dr5RGzOO.svg              [39m[1m[2m342.53 kB[22m[1m[22m[2m │ gzip: 105.26 kB[22m
10:11:56.738 [2mdist/[22m[2massets/[22m[32mInterVariable-CWi-zmRD.woff2         [39m[1m[2m345.59 kB[22m[1m[22m
10:11:56.738 [2mdist/[22m[2massets/[22m[32mInterVariable-Italic-d6KXgdvN.woff2  [39m[1m[2m380.90 kB[22m[1m[22m
10:11:56.739 [2mdist/[22m[2massets/[22m[35mindex-y-ElOoWO.css                   [39m[1m[2m181.64 kB[22m[1m[22m[2m │ gzip:  27.84 kB[22m
10:11:56.740 [2mdist/[22m[2massets/[22m[35mContracts-wnz7ZLhV.css               [39m[1m[2m182.33 kB[22m[1m[22m[2m │ gzip:  19.49 kB[22m
10:11:56.740 [2mdist/[22m[2massets/[22m[36mfinancial-vendor-l0sNRNKZ.js         [39m[1m[2m  0.00 kB[22m[1m[22m[2m │ gzip:   0.02 kB[22m
10:11:56.741 [2mdist/[22m[2massets/[22m[36mchevron-down-ltQM0Ogn.js             [39m[1m[2m  0.30 kB[22m[1m[22m[2m │ gzip:   0.24 kB[22m
10:11:56.741 [2mdist/[22m[2massets/[22m[36mchevron-left-D85KxUHR.js             [39m[1m[2m  0.30 kB[22m[1m[22m[2m │ gzip:   0.25 kB[22m
10:11:56.741 [2mdist/[22m[2massets/[22m[36mplus-B1KThBk6.js                     [39m[1m[2m  0.32 kB[22m[1m[22m[2m │ gzip:   0.25 kB[22m
10:11:56.741 [2mdist/[22m[2massets/[22m[36mfilter-W_-fSAhv.js                   [39m[1m[2m  0.33 kB[22m[1m[22m[2m │ gzip:   0.26 kB[22m
10:11:56.741 [2mdist/[22m[2massets/[22m[36marrow-right-U5ZSfq_L.js              [39m[1m[2m  0.33 kB[22m[1m[22m[2m │ gzip:   0.26 kB[22m
10:11:56.742 [2mdist/[22m[2massets/[22m[36marrow-left-CVFOLno0.js               [39m[1m[2m  0.33 kB[22m[1m[22m[2m │ gzip:   0.27 kB[22m
10:11:56.742 [2mdist/[22m[2massets/[22m[36msearch-BH4uHxHY.js                   [39m[1m[2m  0.34 kB[22m[1m[22m[2m │ gzip:   0.27 kB[22m
10:11:56.742 [2mdist/[22m[2massets/[22m[36mcircle-check-koIFHXxM.js             [39m[1m[2m  0.35 kB[22m[1m[22m[2m │ gzip:   0.27 kB[22m
10:11:56.742 [2mdist/[22m[2massets/[22m[36mclock-DuTGwCOy.js                    [39m[1m[2m  0.35 kB[22m[1m[22m[2m │ gzip:   0.28 kB[22m
10:11:56.742 [2mdist/[22m[2massets/[22m[36mcircle-check-big-B9pLxtT5.js         [39m[1m[2m  0.36 kB[22m[1m[22m[2m │ gzip:   0.28 kB[22m
10:11:56.742 [2mdist/[22m[2massets/[22m[36muser-CmKQW6ms.js                     [39m[1m[2m  0.37 kB[22m[1m[22m[2m │ gzip:   0.29 kB[22m
10:11:56.742 [2mdist/[22m[2massets/[22m[36msmartphone-DajCStMZ.js               [39m[1m[2m  0.37 kB[22m[1m[22m[2m │ gzip:   0.29 kB[22m
10:11:56.743 [2mdist/[22m[2massets/[22m[36museAuditLogger-Eh2bEM51.js           [39m[1m[2m  0.37 kB[22m[1m[22m[2m │ gzip:   0.29 kB[22m
10:11:56.743 [2mdist/[22m[2massets/[22m[36minfo-DJFOKxRM.js                     [39m[1m[2m  0.37 kB[22m[1m[22m[2m │ gzip:   0.28 kB[22m
10:11:56.743 [2mdist/[22m[2massets/[22m[36mtrending-up-CzPl4TNb.js              [39m[1m[2m  0.37 kB[22m[1m[22m[2m │ gzip:   0.29 kB[22m
10:11:56.743 [2mdist/[22m[2massets/[22m[36mcircle-x-07-5K78V.js                 [39m[1m[2m  0.38 kB[22m[1m[22m[2m │ gzip:   0.28 kB[22m
10:11:56.754 [2mdist/[22m[2massets/[22m[36mcredit-card-BAmBur8A.js              [39m[1m[2m  0.38 kB[22m[1m[22m[2m │ gzip:   0.29 kB[22m
10:11:56.754 [2mdist/[22m[2massets/[22m[36mtrending-down-C9jBqG3y.js            [39m[1m[2m  0.38 kB[22m[1m[22m[2m │ gzip:   0.28 kB[22m
10:11:56.754 [2mdist/[22m[2massets/[22m[36mmail-DcFJsY22.js                     [39m[1m[2m  0.38 kB[22m[1m[22m[2m │ gzip:   0.30 kB[22m
10:11:56.754 [2mdist/[22m[2massets/[22m[36mdollar-sign-CKJC9JrL.js              [39m[1m[2m  0.39 kB[22m[1m[22m[2m │ gzip:   0.30 kB[22m
10:11:56.754 [2mdist/[22m[2massets/[22m[36mLayout-C7wRjZcF.js                   [39m[1m[2m  0.39 kB[22m[1m[22m[2m │ gzip:   0.25 kB[22m
10:11:56.755 [2mdist/[22m[2massets/[22m[36mellipsis-CvaNreyq.js                 [39m[1m[2m  0.40 kB[22m[1m[22m[2m │ gzip:   0.27 kB[22m
10:11:56.755 [2mdist/[22m[2massets/[22m[36mcopy-CAseeQPE.js                     [39m[1m[2m  0.41 kB[22m[1m[22m[2m │ gzip:   0.31 kB[22m
10:11:56.755 [2mdist/[22m[2massets/[22m[36mpercent-BaF4tPJp.js                  [39m[1m[2m  0.41 kB[22m[1m[22m[2m │ gzip:   0.29 kB[22m
10:11:56.755 [2mdist/[22m[2massets/[22m[36mdatabase-D7T4VKQs.js                 [39m[1m[2m  0.41 kB[22m[1m[22m[2m │ gzip:   0.31 kB[22m
10:11:56.755 [2mdist/[22m[2massets/[22m[36mcircle-alert-eU46p1-h.js             [39m[1m[2m  0.42 kB[22m[1m[22m[2m │ gzip:   0.29 kB[22m
10:11:56.755 [2mdist/[22m[2massets/[22m[36meye-KtNyIe4Z.js                      [39m[1m[2m  0.43 kB[22m[1m[22m[2m │ gzip:   0.31 kB[22m
10:11:56.755 [2mdist/[22m[2massets/[22m[36mlink-tubgmJVh.js                     [39m[1m[2m  0.43 kB[22m[1m[22m[2m │ gzip:   0.30 kB[22m
10:11:56.755 [2mdist/[22m[2massets/[22m[36mcalendar-CX1EabOK.js                 [39m[1m[2m  0.43 kB[22m[1m[22m[2m │ gzip:   0.31 kB[22m
10:11:56.755 [2mdist/[22m[2massets/[22m[36mmap-pin-CK4nQE5s.js                  [39m[1m[2m  0.43 kB[22m[1m[22m[2m │ gzip:   0.33 kB[22m
10:11:56.755 [2mdist/[22m[2massets/[22m[36mdownload-CtHP-XGI.js                 [39m[1m[2m  0.43 kB[22m[1m[22m[2m │ gzip:   0.32 kB[22m
10:11:56.755 [2mdist/[22m[2massets/[22m[36mzap-MxudmDln.js                      [39m[1m[2m  0.43 kB[22m[1m[22m[2m │ gzip:   0.31 kB[22m
10:11:56.755 [2mdist/[22m[2massets/[22m[36mpencil-hEM5xglL.js                   [39m[1m[2m  0.45 kB[22m[1m[22m[2m │ gzip:   0.33 kB[22m
10:11:56.755 [2mdist/[22m[2massets/[22m[36mhash-BwfKYLMi.js                     [39m[1m[2m  0.47 kB[22m[1m[22m[2m │ gzip:   0.30 kB[22m
10:11:56.756 [2mdist/[22m[2massets/[22m[36muser-plus-9-CEzy4C.js                [39m[1m[2m  0.48 kB[22m[1m[22m[2m │ gzip:   0.34 kB[22m
10:11:56.756 [2mdist/[22m[2massets/[22m[36msquare-pen-CcQ5QYhn.js               [39m[1m[2m  0.49 kB[22m[1m[22m[2m │ gzip:   0.34 kB[22m
10:11:56.756 [2mdist/[22m[2massets/[22m[36mtag-BjFE3yQr.js                      [39m[1m[2m  0.50 kB[22m[1m[22m[2m │ gzip:   0.35 kB[22m
10:11:56.756 [2mdist/[22m[2massets/[22m[36msave-Z4mb-rY8.js                     [39m[1m[2m  0.50 kB[22m[1m[22m[2m │ gzip:   0.33 kB[22m
10:11:56.756 [2mdist/[22m[2massets/[22m[36mtextarea-DMFvuXhs.js                 [39m[1m[2m  0.52 kB[22m[1m[22m[2m │ gzip:   0.36 kB[22m
10:11:56.756 [2mdist/[22m[2massets/[22m[36mtrash-2-DBttTVgW.js                  [39m[1m[2m  0.53 kB[22m[1m[22m[2m │ gzip:   0.35 kB[22m
10:11:56.756 [2mdist/[22m[2massets/[22m[36msettings-B7jkSde5.js                 [39m[1m[2m  0.56 kB[22m[1m[22m[2m │ gzip:   0.28 kB[22m
10:11:56.756 [2mdist/[22m[2massets/[22m[36mphone-CtINvb5A.js                    [39m[1m[2m  0.56 kB[22m[1m[22m[2m │ gzip:   0.36 kB[22m
10:11:56.756 [2mdist/[22m[2massets/[22m[36minput-BolhswKR.js                    [39m[1m[2m  0.59 kB[22m[1m[22m[2m │ gzip:   0.39 kB[22m
10:11:56.756 [2mdist/[22m[2massets/[22m[36mtenantUserUtils-DhhEJlbu.js          [39m[1m[2m  0.65 kB[22m[1m[22m[2m │ gzip:   0.39 kB[22m
10:11:56.756 [2mdist/[22m[2massets/[22m[36msparkles-CGRcavBB.js                 [39m[1m[2m  0.68 kB[22m[1m[22m[2m │ gzip:   0.40 kB[22m
10:11:56.756 [2mdist/[22m[2massets/[22m[36mfile-text-DTS4YG8U.js                [39m[1m[2m  0.87 kB[22m[1m[22m[2m │ gzip:   0.39 kB[22m
10:11:56.756 [2mdist/[22m[2massets/[22m[36mv4-ChpN7rDH.js                       [39m[1m[2m  0.89 kB[22m[1m[22m[2m │ gzip:   0.49 kB[22m
10:11:56.756 [2mdist/[22m[2massets/[22m[36mlabel-B_S_3OST.js                    [39m[1m[2m  0.96 kB[22m[1m[22m[2m │ gzip:   0.59 kB[22m
10:11:56.756 [2mdist/[22m[2massets/[22m[36mcard-B-cOLDFU.js                     [39m[1m[2m  1.07 kB[22m[1m[22m[2m │ gzip:   0.42 kB[22m
10:11:56.756 [2mdist/[22m[2massets/[22m[36mNotFound-Cg0EvhRX.js                 [39m[1m[2m  1.16 kB[22m[1m[22m[2m │ gzip:   0.60 kB[22m
10:11:56.757 [2mdist/[22m[2massets/[22m[36museTenantAccessGuard-DYrrDuoE.js     [39m[1m[2m  1.26 kB[22m[1m[22m[2m │ gzip:   0.64 kB[22m
10:11:56.757 [2mdist/[22m[2massets/[22m[36mInvalidLink-BnrnVFpd.js              [39m[1m[2m  1.28 kB[22m[1m[22m[2m │ gzip:   0.66 kB[22m
10:11:56.757 [2mdist/[22m[2massets/[22m[36mpagination-BeaddpdL.js               [39m[1m[2m  1.47 kB[22m[1m[22m[2m │ gzip:   0.61 kB[22m
10:11:56.757 [2mdist/[22m[2massets/[22m[36memailUtils-Ch8dhCcT.js               [39m[1m[2m  1.59 kB[22m[1m[22m[2m │ gzip:   0.71 kB[22m
10:11:56.757 [2mdist/[22m[2massets/[22m[36mtable-DPAdjtXn.js                    [39m[1m[2m  1.60 kB[22m[1m[22m[2m │ gzip:   0.59 kB[22m
10:11:56.757 [2mdist/[22m[2massets/[22m[36mchargeUtils-x1Rl3MpD.js              [39m[1m[2m  1.70 kB[22m[1m[22m[2m │ gzip:   0.83 kB[22m
10:11:56.757 [2mdist/[22m[2massets/[22m[36mskeleton-D5TiASZv.js                 [39m[1m[2m  1.74 kB[22m[1m[22m[2m │ gzip:   0.57 kB[22m
10:11:56.757 [2mdist/[22m[2massets/[22m[36mtokenManager-BtNqArcW.js             [39m[1m[2m  1.88 kB[22m[1m[22m[2m │ gzip:   0.73 kB[22m
10:11:56.757 [2mdist/[22m[2massets/[22m[36mdate-range-picker-CowAOq_J.js        [39m[1m[2m  2.04 kB[22m[1m[22m[2m │ gzip:   1.05 kB[22m
10:11:56.757 [2mdist/[22m[2massets/[22m[36mCustomers-CZkdde-d.js                [39m[1m[2m  2.05 kB[22m[1m[22m[2m │ gzip:   0.86 kB[22m
10:11:56.758 [2mdist/[22m[2massets/[22m[36mInvoices-BlLvdzTT.js                 [39m[1m[2m  2.07 kB[22m[1m[22m[2m │ gzip:   0.87 kB[22m
10:11:56.758 [2mdist/[22m[2massets/[22m[36mauthTokenManager-DrWa9Hnw.js         [39m[1m[2m  2.15 kB[22m[1m[22m[2m │ gzip:   1.02 kB[22m
10:11:56.758 [2mdist/[22m[2massets/[22m[36museUpdateValues-BfE-3bkW.js          [39m[1m[2m  2.27 kB[22m[1m[22m[2m │ gzip:   0.99 kB[22m
10:11:56.758 [2mdist/[22m[2massets/[22m[36mdialog-Z-RwM5CN.js                   [39m[1m[2m  2.33 kB[22m[1m[22m[2m │ gzip:   0.93 kB[22m
10:11:56.758 [2mdist/[22m[2massets/[22m[36mselect-Dz4DUFDi.js                   [39m[1m[2m  2.55 kB[22m[1m[22m[2m │ gzip:   1.02 kB[22m
10:11:56.758 [2mdist/[22m[2massets/[22m[36mform-DmyN9UI6.js                     [39m[1m[2m  2.79 kB[22m[1m[22m[2m │ gzip:   1.22 kB[22m
10:11:56.758 [2mdist/[22m[2massets/[22m[36mcollapsible-DBGxq14t.js              [39m[1m[2m  2.88 kB[22m[1m[22m[2m │ gzip:   1.31 kB[22m
10:11:56.759 [2mdist/[22m[2massets/[22m[36mindex-gF47VYgo.js                    [39m[1m[2m  2.95 kB[22m[1m[22m[2m │ gzip:   1.42 kB[22m
10:11:56.759 [2mdist/[22m[2massets/[22m[36mResetPassword-CVmt-i2q.js            [39m[1m[2m  2.97 kB[22m[1m[22m[2m │ gzip:   1.24 kB[22m
10:11:56.759 [2mdist/[22m[2massets/[22m[36mswitch-C8gBQ_RB.js                   [39m[1m[2m  3.21 kB[22m[1m[22m[2m │ gzip:   1.60 kB[22m
10:11:56.759 [2mdist/[22m[2massets/[22m[36mRegister-Dw7m1W0D.js                 [39m[1m[2m  3.36 kB[22m[1m[22m[2m │ gzip:   1.50 kB[22m
10:11:56.759 [2mdist/[22m[2massets/[22m[36mtabs-IMsalEpv.js                     [39m[1m[2m  3.62 kB[22m[1m[22m[2m │ gzip:   1.56 kB[22m
10:11:56.759 [2mdist/[22m[2massets/[22m[36museCustomers-CyF_pUM5.js             [39m[1m[2m  3.70 kB[22m[1m[22m[2m │ gzip:   1.55 kB[22m
10:11:56.759 [2mdist/[22m[2massets/[22m[36msearchable-select-CIodv5Qy.js        [39m[1m[2m  3.96 kB[22m[1m[22m[2m │ gzip:   1.53 kB[22m
10:11:56.759 [2mdist/[22m[2massets/[22m[36mnew-BrC_Gm0j.js                      [39m[1m[2m  4.44 kB[22m[1m[22m[2m │ gzip:   1.76 kB[22m
10:11:56.763 [2mdist/[22m[2massets/[22m[36mindex-C-ZjbxUN.js                    [39m[1m[2m  4.51 kB[22m[1m[22m[2m │ gzip:   1.72 kB[22m
10:11:56.763 [2mdist/[22m[2massets/[22m[36mcheckbox-SsCexpoy.js                 [39m[1m[2m  4.58 kB[22m[1m[22m[2m │ gzip:   2.05 kB[22m
10:11:56.763 [2mdist/[22m[2massets/[22m[36museSecureProducts-LcI5q_Nx.js        [39m[1m[2m  4.71 kB[22m[1m[22m[2m │ gzip:   1.58 kB[22m
10:11:56.764 [2mdist/[22m[2massets/[22m[36malert-dialog-DFs9brXC.js             [39m[1m[2m  5.10 kB[22m[1m[22m[2m │ gzip:   1.91 kB[22m
10:11:56.764 [2mdist/[22m[2massets/[22m[36mimportService-BmqIBmSN.js            [39m[1m[2m  5.13 kB[22m[1m[22m[2m │ gzip:   1.98 kB[22m
10:11:56.764 [2mdist/[22m[2massets/[22m[36mUpdateValues-D46Bbz07.js             [39m[1m[2m  5.29 kB[22m[1m[22m[2m │ gzip:   2.02 kB[22m
10:11:56.764 [2mdist/[22m[2massets/[22m[36mnew-BVX4c7uk.js                      [39m[1m[2m  5.39 kB[22m[1m[22m[2m │ gzip:   2.04 kB[22m
10:11:56.764 [2mdist/[22m[2massets/[22m[36m_id_-CTtKP8FI.js                     [39m[1m[2m  5.55 kB[22m[1m[22m[2m │ gzip:   2.16 kB[22m
10:11:56.764 [2mdist/[22m[2massets/[22m[36mindex-CBxGu9nQ.js                    [39m[1m[2m  5.99 kB[22m[1m[22m[2m │ gzip:   2.08 kB[22m
10:11:56.764 [2mdist/[22m[2massets/[22m[36mindex-C7k9-5mW.js                    [39m[1m[2m  6.10 kB[22m[1m[22m[2m │ gzip:   2.13 kB[22m
10:11:56.770 [2mdist/[22m[2massets/[22m[36museServices-B5jnKe6G.js              [39m[1m[2m  6.32 kB[22m[1m[22m[2m │ gzip:   2.13 kB[22m
10:11:56.770 [2mdist/[22m[2massets/[22m[36mpopover-BQhNCC8y.js                  [39m[1m[2m  6.56 kB[22m[1m[22m[2m │ gzip:   2.27 kB[22m
10:11:56.770 [2mdist/[22m[2massets/[22m[36mPageLayout-B7ICG29U.js               [39m[1m[2m  7.02 kB[22m[1m[22m[2m │ gzip:   2.50 kB[22m
10:11:56.770 [2mdist/[22m[2massets/[22m[36mhistory-Brik--ib.js                  [39m[1m[2m  7.20 kB[22m[1m[22m[2m │ gzip:   2.41 kB[22m
10:11:56.770 [2mdist/[22m[2massets/[22m[36mInvites-B7V8-HKI.js                  [39m[1m[2m  7.26 kB[22m[1m[22m[2m │ gzip:   2.76 kB[22m
10:11:56.770 [2mdist/[22m[2massets/[22m[36mProfile-BEUTo_nn.js                  [39m[1m[2m  8.84 kB[22m[1m[22m[2m │ gzip:   3.36 kB[22m
10:11:56.770 [2mdist/[22m[2massets/[22m[36mindex-BglaPoKh.js                    [39m[1m[2m  9.18 kB[22m[1m[22m[2m │ gzip:   3.18 kB[22m
10:11:56.770 [2mdist/[22m[2massets/[22m[36mclientsService-Cpwfcs6D.js           [39m[1m[2m 10.03 kB[22m[1m[22m[2m │ gzip:   3.18 kB[22m
10:11:56.770 [2mdist/[22m[2massets/[22m[36mIntegrations-BmXHeYDT.js             [39m[1m[2m 11.82 kB[22m[1m[22m[2m │ gzip:   3.56 kB[22m
10:11:56.770 [2mdist/[22m[2massets/[22m[36mRequestUpdate-Dmop97zT.js            [39m[1m[2m 12.07 kB[22m[1m[22m[2m │ gzip:   3.95 kB[22m
10:11:56.770 [2mdist/[22m[2massets/[22m[36mTemplates-BNzZHTOO.js                [39m[1m[2m 13.47 kB[22m[1m[22m[2m │ gzip:   4.05 kB[22m
10:11:56.770 [2mdist/[22m[2massets/[22m[36m_id_-0PclJSAm.js                     [39m[1m[2m 13.63 kB[22m[1m[22m[2m │ gzip:   4.20 kB[22m
10:11:56.770 [2mdist/[22m[2massets/[22m[36mNotifications-sIIlGOog.js            [39m[1m[2m 13.76 kB[22m[1m[22m[2m │ gzip:   4.16 kB[22m
10:11:56.773 [2mdist/[22m[2massets/[22m[36mindex-CnHOvr8q.js                    [39m[1m[2m 14.73 kB[22m[1m[22m[2m │ gzip:   3.22 kB[22m
10:11:56.773 [2mdist/[22m[2massets/[22m[36mLogin-C-K5CaSE.js                    [39m[1m[2m 15.65 kB[22m[1m[22m[2m │ gzip:   5.34 kB[22m
10:11:56.773 [2mdist/[22m[2massets/[22m[36mRecebimentos-DM3GbrUO.js             [39m[1m[2m 16.43 kB[22m[1m[22m[2m │ gzip:   5.37 kB[22m
10:11:56.773 [2mdist/[22m[2massets/[22m[36mrouter-vendor-CdMaGfQB.js            [39m[1m[2m 21.94 kB[22m[1m[22m[2m │ gzip:   8.18 kB[22m
10:11:56.773 [2mdist/[22m[2massets/[22m[36mTasks-DMgGof7j.js                    [39m[1m[2m 21.99 kB[22m[1m[22m[2m │ gzip:   6.38 kB[22m
10:11:56.773 [2mdist/[22m[2massets/[22m[36mUserManagement-BoMUln0X.js           [39m[1m[2m 22.31 kB[22m[1m[22m[2m │ gzip:   6.33 kB[22m
10:11:56.773 [2mdist/[22m[2massets/[22m[36mSidebar-BBlqB2H3.js                  [39m[1m[2m 25.08 kB[22m[1m[22m[2m │ gzip:   7.53 kB[22m
10:11:56.773 [2mdist/[22m[2massets/[22m[36mContractSettings-B9-W4-KZ.js         [39m[1m[2m 25.10 kB[22m[1m[22m[2m │ gzip:   6.23 kB[22m
10:11:56.773 [2mdist/[22m[2massets/[22m[36mportal-selection-DzXb73AI.js         [39m[1m[2m 25.16 kB[22m[1m[22m[2m │ gzip:   6.71 kB[22m
10:11:56.773 [2mdist/[22m[2massets/[22m[36mexamples-CcKaKGFe.js                 [39m[1m[2m 25.39 kB[22m[1m[22m[2m │ gzip:   5.17 kB[22m
10:11:56.773 [2mdist/[22m[2massets/[22m[36mindex-D7Dqy16y.js                    [39m[1m[2m 26.20 kB[22m[1m[22m[2m │ gzip:   7.03 kB[22m
10:11:56.773 [2mdist/[22m[2massets/[22m[36mReconciliation-DVrF3NPx.js           [39m[1m[2m 27.13 kB[22m[1m[22m[2m │ gzip:   6.93 kB[22m
10:11:56.773 [2mdist/[22m[2massets/[22m[36mdate-vendor-C-ew5v0I.js              [39m[1m[2m 27.90 kB[22m[1m[22m[2m │ gzip:   8.16 kB[22m
10:11:56.773 [2mdist/[22m[2massets/[22m[36mindex-DP85qgk5.js                    [39m[1m[2m 30.08 kB[22m[1m[22m[2m │ gzip:   9.09 kB[22m
10:11:56.773 [2mdist/[22m[2massets/[22m[36mReconciliationTable-Ds16aWO_.js      [39m[1m[2m 31.16 kB[22m[1m[22m[2m │ gzip:   7.04 kB[22m
10:11:56.774 [2mdist/[22m[2massets/[22m[36mwhatsappService-Dr5SsRAX.js          [39m[1m[2m 31.44 kB[22m[1m[22m[2m │ gzip:   8.57 kB[22m
10:11:56.774 [2mdist/[22m[2massets/[22m[36mcalendar-C8GElx6S.js                 [39m[1m[2m 32.40 kB[22m[1m[22m[2m │ gzip:  10.35 kB[22m
10:11:56.774 [2mdist/[22m[2massets/[22m[36maxios-vendor-CRwtDD-x.js             [39m[1m[2m 35.77 kB[22m[1m[22m[2m │ gzip:  14.47 kB[22m
10:11:56.774 [2mdist/[22m[2massets/[22m[36mquery-vendor-CiucrqvP.js             [39m[1m[2m 38.52 kB[22m[1m[22m[2m │ gzip:  11.47 kB[22m
10:11:56.774 [2mdist/[22m[2massets/[22m[36mDashboard-Cd4Ugi_K.js                [39m[1m[2m 49.80 kB[22m[1m[22m[2m │ gzip:  13.06 kB[22m
10:11:56.774 [2mdist/[22m[2massets/[22m[36mform-vendor-BR9EX3pg.js              [39m[1m[2m 87.13 kB[22m[1m[22m[2m │ gzip:  24.38 kB[22m
10:11:56.774 [2mdist/[22m[2massets/[22m[36mFaturamentoKanban-CwMDh3yQ.js        [39m[1m[2m 90.48 kB[22m[1m[22m[2m │ gzip:  27.63 kB[22m
10:11:56.774 [2mdist/[22m[2massets/[22m[36mCharges-DORHclwg.js                  [39m[1m[2m 91.56 kB[22m[1m[22m[2m │ gzip:  24.47 kB[22m
10:11:56.774 [2mdist/[22m[2massets/[22m[36mSettings-DHNNX05f.js                 [39m[1m[2m 98.50 kB[22m[1m[22m[2m │ gzip:  23.05 kB[22m
10:11:56.774 [2mdist/[22m[2massets/[22m[36mui-vendor-BbMrD5RJ.js                [39m[1m[2m118.30 kB[22m[1m[22m[2m │ gzip:  37.26 kB[22m
10:11:56.774 [2mdist/[22m[2massets/[22m[36msupabase-vendor-DyUP7IU6.js          [39m[1m[2m124.10 kB[22m[1m[22m[2m │ gzip:  34.14 kB[22m
10:11:56.774 [2mdist/[22m[2massets/[22m[36mreact-vendor-DiUaW66x.js             [39m[1m[2m142.30 kB[22m[1m[22m[2m │ gzip:  45.65 kB[22m
10:11:56.774 [2mdist/[22m[2massets/[22m[36mChargeDetailDrawer-C8O3iCkE.js       [39m[1m[2m154.78 kB[22m[1m[22m[2m │ gzip:  50.53 kB[22m
10:11:56.774 [2mdist/[22m[2massets/[22m[36mClients-CA-rraLd.js                  [39m[1m[2m186.60 kB[22m[1m[22m[2m │ gzip:  49.41 kB[22m
10:11:56.774 [2mdist/[22m[2massets/[22m[36mContracts-DhO-LB7G.js                [39m[1m[2m212.60 kB[22m[1m[22m[2m │ gzip:  45.24 kB[22m
10:11:56.774 [2mdist/[22m[2massets/[22m[36mindex-CZEJG6SO.js                    [39m[1m[2m375.13 kB[22m[1m[22m[2m │ gzip: 116.91 kB[22m
10:11:56.774 [2mdist/[22m[2massets/[22m[36mchart-vendor-BFNsr6_t.js             [39m[1m[2m417.48 kB[22m[1m[22m[2m │ gzip: 118.81 kB[22m
10:11:56.774 [32m✓ built in 18.57s[39m
10:11:56.894 Warning: Detected "engines": { "node": ">=18.0.0" } in your `package.json` that will automatically upgrade when a new major Node.js Version is released. Learn More: http://vercel.link/node-version
10:11:57.205 Using TypeScript 5.6.3 (local user-provided)
10:11:59.658 middleware.ts(6,43): error TS2307: Cannot find module 'next/server' or its corresponding type declarations.
10:11:59.658 
10:11:59.839 src/middleware/securityMiddleware.ts(6,43): error TS2307: Cannot find module 'next/server' or its corresponding type declarations.
10:11:59.839 src/middleware/securityMiddleware.ts(7,1): error TS6133: 'createServerClient' is declared but its value is never read.
10:11:59.840 src/middleware/securityMiddleware.ts(9,3): error TS6133: 'AUTH_CONSTANTS' is declared but its value is never read.
10:11:59.840 src/middleware/securityMiddleware.ts(114,55): error TS2554: Expected 0 arguments, but got 2.
10:11:59.840 src/middleware/securityMiddleware.ts(214,26): error TS2554: Expected 0 arguments, but got 1.
10:11:59.840 src/middleware/securityMiddleware.ts(221,20): error TS2304: Cannot find name 'createMiddlewareClient'.
10:11:59.840 src/middleware/securityMiddleware.ts(226,42): error TS2345: Argument of type 'Promise<string>' is not assignable to parameter of type 'string'.
10:11:59.841 src/middleware/securityMiddleware.ts(233,11): error TS2345: Argument of type 'Promise<string>' is not assignable to parameter of type 'string'.
10:11:59.841 src/middleware/securityMiddleware.ts(251,53): error TS2345: Argument of type 'Promise<string>' is not assignable to parameter of type 'string'.
10:11:59.841 src/middleware/securityMiddleware.ts(271,11): error TS2345: Argument of type 'Promise<string>' is not assignable to parameter of type 'string'.
10:11:59.841 src/middleware/securityMiddleware.ts(292,11): error TS2345: Argument of type 'Promise<string>' is not assignable to parameter of type 'string'.
10:11:59.841 src/middleware/securityMiddleware.ts(312,59): error TS2554: Expected 0 arguments, but got 2.
10:11:59.842 src/middleware/securityMiddleware.ts(343,67): error TS2554: Expected 0 arguments, but got 2.
10:11:59.842 src/middleware/securityMiddleware.ts(348,9): error TS2345: Argument of type 'Promise<string>' is not assignable to parameter of type 'string'.
10:11:59.842 src/middleware/securityMiddleware.ts(361,21): error TS4111: Property 'NODE_ENV' comes from an index signature, so it must be accessed with ['NODE_ENV'].
10:11:59.842 src/middleware/securityMiddleware.ts(378,7): error TS2345: Argument of type 'Promise<string>' is not assignable to parameter of type 'string'.
10:11:59.843 
10:12:00.108 Build Completed in /vercel/output [59s]
10:12:00.399 Deploying outputs...
10:12:00.908 Error: The Edge Function "middleware" is referencing unsupported modules:
10:12:00.908 	- __vc__ns__/0/middleware.js: next/server
10:12:00.909 	- __vc__ns__/0/src/middleware/securityMiddleware.js: next/server