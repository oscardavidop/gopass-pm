const major = Number(process.versions.node.split('.')[0]);

if (major >= 25) {
  console.error('Node.js 25+ is not supported for this workspace yet. Use Node.js 20 LTS to avoid runtime/deprecation issues.');
  process.exit(1);
}
