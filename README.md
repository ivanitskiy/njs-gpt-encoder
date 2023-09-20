this is an attempt to https://github.com/latitudegames/GPT-3-Encoder/ to NJS runtime

to start it:

    $ docker compose up

then can be tested like that:

```
curl -d "Welcome. Replace this with your text to see how tokenization works." http://localhost:8009/
body: Welcome. Replace this with your text to see how tokenization works.
encoded: ,234,220,,220,,220,,220,,220,,220,,220,,220,,220,,220,,234
decoded: .          .%

```
