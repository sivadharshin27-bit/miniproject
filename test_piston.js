const execute = async () => {
  const req = {
    language: 'python',
    version: '*',
    files: [{ content: 'print("Hello Piston")' }]
  };
  try {
    const res = await fetch('https://piston.devs.sh/api/v2/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req)
    });
    console.log(await res.json());
  } catch(e) {
    console.log("Error:", e.message);
  }
}
execute();
