## Using Chalk 4.x

Chalk 5.x is only ESM compatible. After a few tries, making ESM compatible project with ts-node and ts-node-dev (or equivalents)
is a config nightmare.
Some extra notes: ts-node support ESM but not ts-node-dev (that give watch option), tsx has an non-formatted error stack display,
and I was not able to make something satisfying.

## Jest `--maxWorkers=50%`

In my case it change test speed from 18sec to 12sec.
https://dev.to/vantanev/make-your-jest-tests-up-to-20-faster-by-changing-a-single-setting-i36
