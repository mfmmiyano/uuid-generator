const { events, Job } = require("brigadier");

events.on("check_suite:requested", checkRequested);
events.on("check_suite:rerequested", checkRequested);
events.on("check_run:rerequested", checkRequested);

function runTests(e, project) {
  var testRunner = new Job("test-runner");

  testRunner.image = "python:3";

  testRunner.tasks = [
    "cd /src",
    "pip install -r requirements.txt",
    "python setup.py test"
  ];

  testRunner.streamLogs = true;

  return testRunner;
}

function checkRequested(e, p) {
  console.log("check requested");

  const checkRunImage = "brigadecore/brigade-github-check-run:latest";

  const env = {
    CHECK_PAYLOAD: e.payload,
    CHECK_NAME: "Brigade",
    CHECK_TITLE: "Run Tests",
  };

  const start = new Job("start-run", checkRunImage);
  start.imageForcePull = true;
  start.env = env;
  start.env.CHECK_SUMMARY = "Beginning test run";

  const end = new Job("end-run", checkRunImage);
  end.imageForcePull = true;
  end.env = env;

  start.run().then(() => {
    return runTests(e, p).run()
  }).then( (result) => {
    end.env.CHECK_CONCLUSION = "success"
    end.env.CHECK_SUMMARY = "Build completed"
    end.env.CHECK_TEXT = result.toString()
    return end.run()
  }).catch( (err) => {
    end.env.CHECK_CONCLUSION = "failure"
    end.env.CHECK_SUMMARY = "Build failed"
    end.env.CHECK_TEXT = `Error: ${ err }`
    return end.run()
  });
}
