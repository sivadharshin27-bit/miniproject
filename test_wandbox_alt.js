const execute = async () => {
  const req = { compiler: 'gcc-13.2.0-c', code: '#include <stdio.h>\nint main(){printf("Hello");return 0;}' };
  try {
    const res = await fetch('https://wandbox.org/api/compile.json', {
      method: 'POST', headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(req)
    });
    console.log(await res.text());
  } catch(e) { console.log("Error:", e.message); }
}
execute();
