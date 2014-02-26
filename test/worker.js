var assert = require("assert"),
    async = require("async"),
    getListCount = require("./getListCount.js"),
    Fireque = require("../index.js"),
    redis = require("redis"),
    client = redis.createClient();

describe('Worker', function(){
    var worker;
    beforeEach(function(done){
        worker = new Fireque.Worker();
        client.flushall(done);
    });
  
    describe('#new Work()', function(){
        it('protocol should return universal', function(){
            assert.equal('universal', worker.protocol);
        });
        it('workload should return 100', function(){
            assert.equal(100, worker.workload);
        });
        it('workinghour should return 1800', function(){
            assert.equal(worker.workinghour, 1800);
        });
        it('wait should return 2', function(){
            assert.equal(2, worker._wait);
        });
        it('timeout should return 60', function(){
            assert.equal(60, worker.timeout);
        });
        it('port should return 6379', function(){
            assert.equal(6379, worker._connection.port);
        });
        it('host should return 127.0.0.1', function(){
            assert.equal('127.0.0.1', worker._connection.host);
        });
        it('_getPrefixforProtocol should return fireque:noname:universal', function(){
            assert.equal(worker._getPrefixforProtocol(), 'fireque:noname:universal');
        });
    });

    describe('#Work Private Function', function(){
        var job;
        beforeEach(function(done){
            job = new Fireque.Job(null, {who: "I'm Job."});
            done();
        });

        this.timeout(5000);

        it('_popJobFromQueue', function(done){
            worker._wait = 1;
            worker._popJobFromQueue(function (err, job) {
                assert.equal(err, true);
                assert.equal(worker._priority.length, 6, '_priority.length should return 6');
                done();
            });
        });

        it('uuid should return test_uuid', function(done){
            var uuid = 'test_uuid';
            async.parallel([
                function (cb) { 
                    client.hmset( worker._getPrefixforProtocol() + ':job:' + uuid,
                        'data', JSON.stringify({'justin':'boy'}),
                        'protocol', 'high',
                    cb);
                },
                function(cb){
                    client.lpush( worker._getPrefixforProtocol() + ':queue', uuid, cb);
                }
            ], function( err, result) {
                assert.equal(err, null);
                worker._popJobFromQueue(function (err, job) {
                    assert.equal(err, null);
                    assert.equal(job.uuid, uuid);
                    done();
                });
            });
        });

        it('completed should return uuid when _assignJobToWorker completed', function(done){
            worker._assignJobToWorker(job, function(job, cb) {
                cb(false);
            }, function (err, echo){
                assert.equal(err, null);
                assert.equal(echo.uuid, job.uuid);
                client.lrange(worker._getPrefixforProtocol() + ':completed', -100, 100, function(err, reply){
                    assert.equal(getListCount(reply, job.uuid), 1, 'should in completed and only 1');
                    done();
                });
            });
        });

        it('failed should return uuid when _assignJobToWorker failed', function (done) {
            worker._assignJobToWorker(job, function(job, cb) {
                cb(true);
            }, function (err, echo){
                assert.equal(err, true);
                assert.equal(echo.uuid, job.uuid);
                client.lrange(worker._getPrefixforProtocol() + ':failed', -100, 100, function (err, reply) {
                    assert.equal(getListCount(reply, job.uuid), 1, 'should in failed and only 1');
                    done();
                });
            });
        });

        it('failed should return uuid when _assignJobToWorker failed', function (done) {
            worker._assignJobToWorker(job, function(job, cb) {
                throw "I'm throw";
            }, function (err, echo){
                assert.equal(err, "I'm throw");
                assert.equal(echo.uuid, job.uuid);
                client.lrange(worker._getPrefixforProtocol() + ':failed', -100, 100, function(err, reply){
                    assert.equal(getListCount(reply, job.uuid), 1, 'should in failed and only 1');
                    done();
                });
            });
        });

        it('_delPriority after _priority shoud return 5', function (done) {
            worker._priority = worker.priority.concat();
            worker._delPriority('high', function (){
                assert.equal(worker._priority.length, 5);
                done();
            });
        });
    });

    describe('#Work Perform', function(){
        var job;
        beforeEach(function(done){
            job = new Fireque.Job(null, {who: "I'm Job."});
            done();
        });

        this.timeout(5000);

        it('_listenQueue should return job from completed', function(done){
            var perform = function (job, cb) {
                job.data = "I'm Perform. and I will Completed.";
                client.lrange( job._getPrefixforProtocol() + ':processing', -100, 100, function(err, reply){
                    assert.equal(getListCount(reply, job.uuid), 1);
                    cb(false);
                });
            };
            worker._worker = perform;
            job.enqueue(true, function (err) {
                assert.equal(err, null);
                worker._listenQueue( function(err, perform_job) {
                    assert.equal(err, null);
                    assert.equal(perform_job.uuid, job.uuid);
                    assert.equal(perform_job.data, "I'm Perform. and I will Completed.");
                    client.lrange( job._getPrefixforProtocol() + ':completed', -100, 100, function(err, reply){
                        assert.equal(getListCount(reply, job.uuid), 1);
                        done();
                    });
                });
            });
        });

        it('_listenQueue should return job from failed', function(done){
            var perform = function (job, cb) {
                job.data = "I'm Perform. and I will Failed.";
                client.lrange( job._getPrefixforProtocol() + ':processing', -100, 100, function(err, reply){
                    assert.equal(getListCount(reply, job.uuid), 1);
                    cb(true);
                });
            };
            worker._worker = perform;
            job.enqueue(true, function (err) {
                assert.equal(err, null);
                worker._listenQueue( function(err, perform_job) {
                    assert.equal(err, true);
                    assert.equal(perform_job.uuid, job.uuid);
                    assert.equal(perform_job.data, "I'm Perform. and I will Failed.");
                    client.lrange( job._getPrefixforProtocol() + ':failed', -100, 100, function(err, reply){
                        assert.equal(getListCount(reply, job.uuid), 1);
                        done();
                    });
                });
            });
        });

        it('onPerform should completed a job', function (done) {
            worker.onPerform(function (job, cb) {
                job.data = "I'm onPerform";
                assert.equal(worker.workinghour > 1388419200000, true);
                assert.equal(worker.workload > 10, true);
                client.lrange( job._getPrefixforProtocol() + ':processing', -100, 100, function(err, reply){
                    assert.equal(getListCount(reply, job.uuid), 1);
                    worker.offPerform(function(){
                        done();
                    });
                    cb(false);
                });
            });
            job.enqueue(true, function (err) {
                assert.equal(err, null);
            });
        });

        it('onAfterPerform should get a job', function (done) {
            var ready = 2;
            worker.onAfterPerform( function(err, perform_job) {
                assert.equal(err, null);
                assert.equal(perform_job.uuid, job.uuid);
                worker.offAfterPerform();
                ready -= 1;
                ready || done();
            });
            worker.onPerform(function (job, cb) {
                job.data = "I'm onPerform";
                client.lrange( job._getPrefixforProtocol() + ':processing', -100, 100, function(err, reply){
                    assert.equal(getListCount(reply, job.uuid), 1);
                    worker.offPerform(function(){
                        ready -= 1;
                        ready || done();
                    });
                    cb(false);
                });
            });
            job.enqueue(true, function (err) {
                assert.equal(err, null);
            });
        });

        it('onWorkOut should run workload < 1', function (done) {
            var ready = 2;
            worker.workload = 1;
            worker.workinghour = 60;
            worker.onPerform(function (job, cb) {
                job.data = "I'm onPerform";
                client.lrange( job._getPrefixforProtocol() + ':processing', -100, 100, function(err, reply){
                    assert.equal(getListCount(reply, job.uuid), 1);
                    cb(false);
                });
            });
            worker.onWorkOut( function () {
                done();
            });
            job.enqueue(true, function (err) {
                assert.equal(err, null);
            });
        });

        it('onWorkOut should run workinghour < now', function (done) {
            var ready = 2;
            worker.workload = 60;
            worker.workinghour = 1;
            worker.onPerform(function (job, cb) {
                job.data = "I'm onPerform";
                client.lrange( job._getPrefixforProtocol() + ':processing', -100, 100, function(err, reply){
                    assert.equal(getListCount(reply, job.uuid), 1);
                    cb(false);
                });
            });
            worker.onWorkOut( function () {
                done();
            });
            job.enqueue(true, function (err) {
                assert.equal(err, null);
            });
        });

        it('priority should high -> low -> queue -> high', function (done) {
            async.series([
                function (cb) {
                    client.lpush( worker._getPrefixforProtocol() + ':buffer:unrestricted:high' ,'xyz' , cb);
                },
                function (cb) {
                    worker._popJobFromQueue( function () {
                        assert.equal(worker._priority[0], 'high');
                        assert.equal(worker._priority[1], 'high');
                        assert.equal(worker._priority[2], 'med');
                        assert.equal(worker._priority[3], 'med');
                        assert.equal(worker._priority[4], 'low');
                        assert.equal(worker._priority.length, 5);
                        cb();
                    });
                },
                function (cb) {
                    client.lpush( worker._getPrefixforProtocol() + ':buffer:unrestricted:low' ,'xyz' , cb);
                },
                function (cb) {
                    worker._popJobFromQueue( function () {
                        assert.equal(worker._priority[0], 'high');
                        assert.equal(worker._priority[1], 'high');
                        assert.equal(worker._priority[2], 'med');
                        assert.equal(worker._priority[3], 'med');
                        assert.equal(worker._priority.length, 4);
                        cb();
                    });
                },
                function (cb) {
                    client.lpush( worker._getPrefixforProtocol() + ':queue' ,'xyz' , cb);
                },
                function (cb) {
                    client.lpush( worker._getPrefixforProtocol() + ':buffer:unrestricted:high' ,'xyz' , cb);
                },
                function (cb) {
                    worker._popJobFromQueue( function () {
                        assert.equal(worker._priority[0], 'high');
                        assert.equal(worker._priority[1], 'high');
                        assert.equal(worker._priority[2], 'med');
                        assert.equal(worker._priority[3], 'med');
                        assert.equal(worker._priority.length, 4);
                        cb();
                    });
                },
                function (cb) {
                    worker._popJobFromQueue( function () {
                        assert.equal(worker._priority[0], 'high');
                        assert.equal(worker._priority[1], 'med');
                        assert.equal(worker._priority[2], 'med');
                        assert.equal(worker._priority.length, 3);
                        cb();
                    });
                }
            ], function (err) {
                assert.equal(err, null);
                done();
            });
        });
    });
});