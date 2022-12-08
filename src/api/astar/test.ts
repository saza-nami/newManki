import express from "express";
import { workerData, parentPort } from "worker_threads";

function highLoadTask() {
  for (let i = 0; i < 2_000_000_000; i++) {}
}

console.time(workerData.timer);
highLoadTask();
console.timeEnd(workerData.timer);
