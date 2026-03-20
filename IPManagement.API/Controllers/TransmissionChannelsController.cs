using IPManagement.API.Authorization;
using IPManagement.API.DTOs;
using IPManagement.API.Services;
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
    public class TransmissionChannelsController : ControllerBase
    {
        private readonly ITransmissionChannelService _service;

        public TransmissionChannelsController(ITransmissionChannelService service)
        {
            _service = service;
        }

        [HttpGet]
        [RequirePermission(FunctionCode.TRANSMISSION_CHANNEL, CommandCode.VIEW)]
        public async Task<ActionResult<TransmissionChannelDto[]>> GetAllChannels()
        {
            var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value!);
            var result = await _service.GetAllChannelsAsync(userId);
            return Ok(result);
        }

        [HttpGet("{id}")]
        [RequirePermission(FunctionCode.TRANSMISSION_CHANNEL, CommandCode.VIEW)]
        public async Task<ActionResult<TransmissionChannelDto>> GetChannel(long id)
        {
            var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value!);
            var result = await _service.GetChannelByIdAsync(userId, id);
            if (result == null)
                return NotFound();

            return Ok(result);
        }

        [HttpGet("unit/{unitId}")]
        [RequirePermission(FunctionCode.TRANSMISSION_CHANNEL, CommandCode.VIEW)]
        public async Task<ActionResult<TransmissionChannelDto[]>> GetChannelsByUnit(long unitId)
        {
            var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value!);
            var result = await _service.GetChannelsByUnitAsync(userId, unitId);
            return Ok(result);
        }

        [HttpPost]
        [RequirePermission(FunctionCode.TRANSMISSION_CHANNEL, CommandCode.CREATE)]
        public async Task<ActionResult<TransmissionChannelDto>> CreateChannel([FromBody] TransmissionChannelCreateRequest request)
        {
            var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value!);
            try
            {
                var result = await _service.CreateChannelAsync(userId, request);
                return CreatedAtAction(nameof(GetChannel), new { id = result.Id }, result);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPut("{id}")]
        [RequirePermission(FunctionCode.TRANSMISSION_CHANNEL, CommandCode.UPDATE)]
        public async Task<ActionResult<TransmissionChannelDto>> UpdateChannel(long id, [FromBody] TransmissionChannelUpdateRequest request)
        {
            var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value!);
            try
            {
                var result = await _service.UpdateChannelAsync(userId, id, request);
                return Ok(result);
            }
            catch (KeyNotFoundException)
            {
                return NotFound();
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpDelete("{id}")]
        [RequirePermission(FunctionCode.TRANSMISSION_CHANNEL, CommandCode.DELETE)]
        public async Task<IActionResult> DeleteChannel(long id)
        {
            var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value!);
            var result = await _service.DeleteChannelAsync(userId, id);
            if (!result)
                return NotFound();

            return NoContent();
        }
    }
}