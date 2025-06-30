document.getElementById('menu-toggle').addEventListener('click', () => {
    const links = document.getElementById('nav-links');
    links.classList.toggle('visible');
})

if(document.getElementById('generate-code')) {
    document.getElementById('generate-code').addEventListener('click', () => {
        const output = document.getElementById('code-result');
        output.textContent = "generating...";
        fetch('https://toyhousecodes.aishuhariharan123.workers.dev/')
            .then(response => response.json())
            .then(data => {
                if(data.error) {
                    output.textContent = data.error;
                } else if(data.code) {
                    output.textContent = `awesome! here's a code: ${data.code} *please note that if the code is left unused, i may add it back into the code pool. you can always come back and generate another!`;
                } else {
                    output.textContent = "No codes left right now!! Check back another time.";
                }
            })
            .catch(err => {
                console.error("Error fetching code:", err);
                output.textContent = "Something went wrong! Try again l8r"
            });
    });

}