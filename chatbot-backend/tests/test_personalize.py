"""
T042 — Contract test: POST /personalize
Constitution Principle VI: write RED first, then GREEN.

Run:
    pytest chatbot-backend/tests/test_personalize.py -v
"""
import pytest


@pytest.mark.asyncio
async def test_personalize_advanced_gpu_expert(client):
    """POST /personalize with advanced profile returns 200 with non-empty personalized_content."""
    payload = {
        "content": (
            "ROS 2 uses DDS as its middleware layer. Publishers and subscribers "
            "communicate over named topics. The quality of service (QoS) settings "
            "control reliability and durability."
        ),
        "experience_level": "Advanced",
        "ros_experience": "expert",
        "has_gpu": True,
        "learning_style": "Hands-on",
    }
    response = await client.post("/personalize", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data["personalized_content"], str)
    assert len(data["personalized_content"]) > 0


@pytest.mark.asyncio
async def test_personalize_beginner_no_gpu(client):
    """POST /personalize with beginner profile returns 200 with adapted content."""
    payload = {
        "content": "ROS 2 nodes communicate via topics using the DDS protocol.",
        "experience_level": "Beginner",
        "ros_experience": "none",
        "has_gpu": False,
        "learning_style": "Visual",
    }
    response = await client.post("/personalize", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data["personalized_content"], str)
    assert len(data["personalized_content"]) > 0
