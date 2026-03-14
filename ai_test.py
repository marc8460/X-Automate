from openai import OpenAI

client = OpenAI()

response = client.responses.create(
    model="gpt-5.4",
    input="Explain what a REST API is in simple terms."
)

print(response.output_text)