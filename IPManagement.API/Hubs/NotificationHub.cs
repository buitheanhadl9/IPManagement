using Microsoft.AspNetCore.SignalR;

namespace IPManagement.API.Hubs;

public class NotificationHub : Hub
{
    // Method để client connect vào hub
    public async Task JoinGroup(string groupName)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, groupName);
        Console.WriteLine($"Connection {Context.ConnectionId} joined group: {groupName}");
    }

    // Method để client rời group
    public async Task LeaveGroup(string groupName)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, groupName);
        Console.WriteLine($"Connection {Context.ConnectionId} left group: {groupName}");
    }

    // Method để gửi notification về một group cụ thể
    public async Task SendNotification(string groupName, string message)
    {
        await Clients.Group(groupName).SendAsync("ReceiveNotification", message);
    }

    public override async Task OnConnectedAsync()
    {
        Console.WriteLine($"Connection {Context.ConnectionId} connected to NotificationHub");
        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        Console.WriteLine($"Connection {Context.ConnectionId} disconnected from NotificationHub");
        await base.OnDisconnectedAsync(exception);
    }
}