# Pilot execution flow

```text
Founder request
      |
      v
Pilot specification --> PM task breakdown --> Coder implementation
      |                         |                    |
      +-------------------------+--------------------+
                                v
                    Deterministic acceptance tests
                         /                 \
                        v                   v
              Draft feedback hidden   Published feedback visible
                        \                   /
                         v                 v
                     QA evidence --> isolated PR review
                                      |
                                      v
                             merge only after gates
```

The pilot runs against fictional fixture data only. It does not modify production data, production configuration, or the Parent Plus main branch.
