import httpx, os, asyncio
from dotenv import load_dotenv
load_dotenv()

key = os.getenv('GROQ_API_KEY')
print("Key:", key)

async def test():
    async with httpx.AsyncClient() as client:
        r = await client.post(
            'https://api.groq.com/openai/v1/chat/completions',
            headers={'Authorization': f'Bearer {key}'},
            json={'model': 'llama3-8b-8192', 'messages': [{'role': 'user', 'content': 'hello'}], 'max_tokens': 50}
        )
        print(r.json())

asyncio.run(test())