const major = Number(process.versions.node.split('.')[0]);

if (major < 20) {
  console.error('Node.js 20+ is required for this workspace.');
  process.exit(1);
}

if (major > 22) {
  console.warn('Node.js 20 or 22 LTS is recommended for production parity with the Docker image.');
}
