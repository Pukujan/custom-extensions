# Dark Reader attribution

Dark Reader npm API v4.9.133, MIT license (see LICENSE).
Source: https://github.com/darkreader/darkreader
Package: https://registry.npmjs.org/darkreader/-/darkreader-4.9.133.tgz
Upstream darkreader.js SHA-256: `82619e7a0bcabbea15a91488bc74fd0f9ba8f8f2a1cc67527f78166037cce166`

Bundled file adds a lexical chrome shim before the exact upstream bytes and a
closing wrapper after them. This prevents the API compatibility stubs from
wrapping native extension messaging. No remote code is loaded at runtime.
