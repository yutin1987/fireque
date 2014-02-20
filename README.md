fireque
=======
佇列

`fireque:{namespace}:{protocol}:queue = [LIST]`

`fireque:{namespace}:{protocol}:processing = [LIST]`

`fireque:{namespace}:{protocol}:completed = [LIST]`

`fireque:{namespace}:{protocol}:failed = [LIST]`


`fireque:{namespace}:{protocol}:buffer:{collapse}:high = [LIST]`

`fireque:{namespace}:{protocol}:buffer:{collapse}:med = [LIST]`

`fireque:{namespace}:{protocol}:buffer:{collapse}:low = [LIST]`

Data

```
fireque:{namespace}:{protocol}:workload:{collapse} = INT
```

```
fireque:{namespace}:{protocol}:timeout:{uuid} = 1
```

```
fireque:{namespace}:job:{uuid} = HASH
	data: "string"
	protocol: "xyz"
	collapse: "string"
	priority: "high", "med", "low"
	work: "work_name"
````
EXPIRE: 3 * 24 * 60 * 60

Config
=======

- FIREQUE_HOST
- FIREQUE_PORT
- FIREQUE_NAMESPACE



Object
=======


## Job

`new Job(protocol, data, option)`
`new Job(uuid, cb)`

`enqueue('collapse', "high|med|low", callback())` 將job放住佇列
`enqueue('collapse', callback())` 將job放住佇列
`enqueue("high|med|low", callback())` 將job放住佇列
`enqueue(false, callback())` 將job放住佇列
`enqueue(callback())` 將job放住佇列

`dequeue(callback())` 刪除指定的job

`requeue('collapse', "high|med|low", callback())` 將job放住佇列
`requeue('collapse', callback())` 將job放住佇列
`requeue("high|med|low", callback())` 將job放住佇列
`requeue(false, callback())` 將job放住佇列
`requeue(callback())` 將job放住佇列

`toCompleted()`

`toFailed()`

## Work

`new Wrok(protocol, option)`

`onPerform(function(job, cb), timeout)` 接收並執行委派的job
```
cb(report)
null: 完成, 但不處理
true: 完成, 並呼叫toCompleted()
false: 失敗, 並呼叫toFailed()
```

`onEnd()` 離開工作

## Producer

`onCompleted(fun([job]))` 當job執行完成

`onFailed(fun(job))` 當job發生錯誤

`onTimeout(fun(job))` 當job發生timeout

## Monitor

`new Monitor(protocol, workload, option)`
