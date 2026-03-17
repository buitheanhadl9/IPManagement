using IPManagement.API.DTOs;
using IPManagement.API.Services;
using IPManagement.API.Authorization;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Security.Claims;
using System.Threading.Tasks;

namespace IPManagement.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class NetworkSystemsController : ControllerBase
    {
        private readonly INetworkSystemService _networkSystemService;

        public NetworkSystemsController(INetworkSystemService networkSystemService)
        {
            _networkSystemService = networkSystemService;
        }

        [HttpGet]
        [RequirePermission(FunctionCode.NETWORK_SYSTEM, CommandCode.VIEW)]
        public async Task<ActionResult<NetworkSystemListResponse>> GetNetworkSystems(
            [FromQuery] int pageNumber = 1,
            [FromQuery] int pageSize = 10,
            [FromQuery] string? searchTerm = null,
            [FromQuery] string? status = null)
        {
            var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value!);
            var result = await _networkSystemService.GetNetworkSystemsAsync(userId, pageNumber, pageSize, searchTerm, status);
            return Ok(result);
        }

        [HttpGet("{systemId}")]
        [RequirePermission(FunctionCode.NETWORK_SYSTEM, CommandCode.VIEW)]
        public async Task<ActionResult<NetworkSystemDto>> GetNetworkSystem(long systemId)
        {
            var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value!);
            var result = await _networkSystemService.GetNetworkSystemByIdAsync(userId, systemId);
            if (result == null)
                return NotFound();

            return Ok(result);
        }

        [HttpPost]
        [RequirePermission(FunctionCode.NETWORK_SYSTEM, CommandCode.CREATE)]
        public async Task<ActionResult<NetworkSystemDto>> CreateNetworkSystem(NetworkSystemCreateRequest request)
        {
            var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value!);
            var result = await _networkSystemService.CreateNetworkSystemAsync(userId, request);
            return CreatedAtAction(nameof(GetNetworkSystem), new { systemId = result.Id }, result);
        }

        [HttpPut("{systemId}")]
        [RequirePermission(FunctionCode.NETWORK_SYSTEM, CommandCode.UPDATE)]
        public async Task<ActionResult<NetworkSystemDto>> UpdateNetworkSystem(long systemId, NetworkSystemUpdateRequest request)
        {
            var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value!);
            var result = await _networkSystemService.UpdateNetworkSystemAsync(userId, systemId, request);
            if (result == null)
                return NotFound();

            return Ok(result);
        }

        [HttpDelete("{systemId}")]
        [RequirePermission(FunctionCode.NETWORK_SYSTEM, CommandCode.DELETE)]
        public async Task<ActionResult> DeleteNetworkSystem(long systemId)
        {
            var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value!);
            var result = await _networkSystemService.DeleteNetworkSystemAsync(userId, systemId);
            if (!result)
                return NotFound();

            return NoContent();
        }

        [HttpGet("{systemId}/available-ips")]
        [RequirePermission(FunctionCode.NETWORK_SYSTEM, CommandCode.VIEW)]
        public async Task<ActionResult<NetworkSystemDto[]>> GetAvailableIpAddresses(long systemId)
        {
            var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value!);
            var result = await _networkSystemService.GetAvailableIpAddressesAsync(userId, systemId);
            return Ok(result);
        }

        [HttpGet("ip-address/{ipId}")]
        [RequirePermission(FunctionCode.NETWORK_SYSTEM, CommandCode.VIEW)]
        public async Task<ActionResult<NetworkSystemDto[]>> GetNetworkSystemsByIpAddress(long ipId)
        {
            var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value!);
            var result = await _networkSystemService.GetNetworkSystemsByIpAddressAsync(userId, ipId);
            return Ok(result);
        }

        [HttpPost("assign-ip")]
        [RequirePermission(FunctionCode.NETWORK_SYSTEM, CommandCode.UPDATE)]
        public async Task<ActionResult> AssignIpAddress(AssignIpAddressRequest request)
        {
            var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value!);
            var result = await _networkSystemService.AssignIpAddressAsync(userId, request);
            if (!result)
                return BadRequest("Failed to assign IP address");

            return Ok();
        }

        [HttpPost("remove-ip")]
        [RequirePermission(FunctionCode.NETWORK_SYSTEM, CommandCode.UPDATE)]
        public async Task<ActionResult> RemoveIpAddress(RemoveIpAddressRequest request)
        {
            var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value!);
            var result = await _networkSystemService.RemoveIpAddressAsync(userId, request);
            if (!result)
                return BadRequest("Failed to remove IP address");

            return Ok();
        }
    }
}